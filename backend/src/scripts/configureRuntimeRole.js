import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const runtimeRole = "vorldx_runtime";
const envPath = path.resolve(".env");
const migrationEnvPath = path.resolve(".env.migrations");
const envContents = fs.readFileSync(envPath, "utf8");
const envValues = dotenv.parse(envContents);
const migrationEnvContents = fs.existsSync(migrationEnvPath)
  ? fs.readFileSync(migrationEnvPath, "utf8")
  : "";
const migrationEnvValues = dotenv.parse(migrationEnvContents);
const configuredRuntimeUrl = envValues.DATABASE_URL;
const activeRuntimeUrl = process.env.DATABASE_URL;

if (!configuredRuntimeUrl || activeRuntimeUrl !== configuredRuntimeUrl) {
  throw new Error(
    "DATABASE_URL must come from backend/.env (with no shell override) before configuring the local runtime role.",
  );
}

const migrationUrl =
  process.env.MIGRATION_DATABASE_URL ||
  migrationEnvValues.MIGRATION_DATABASE_URL ||
  configuredRuntimeUrl;

if (process.env.MIGRATION_DATABASE_URL && migrationEnvValues.MIGRATION_DATABASE_URL &&
    process.env.MIGRATION_DATABASE_URL !== migrationEnvValues.MIGRATION_DATABASE_URL) {
  throw new Error(
    "MIGRATION_DATABASE_URL from the shell differs from backend/.env.migrations; resolve the override before proceeding.",
  );
}

const migrationConnection = new PrismaClient({ datasourceUrl: migrationUrl });

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function setEnvValue(contents, key, value) {
  const lines = contents.split(/\r?\n/);
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line));

  if (matches.length > 1) {
    throw new Error(`backend/.env contains more than one ${key} entry.`);
  }

  if (matches.length === 1) {
    lines[matches[0].index] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

try {
  const [connection] = await migrationConnection.$queryRaw`
    SELECT current_database() AS database_name, current_schema() AS schema_name
  `;
  const [existingRole] = await migrationConnection.$queryRaw`
    SELECT rolname
    FROM pg_roles
    WHERE rolname = ${runtimeRole}
  `;

  if (existingRole) {
    const [membership] = await migrationConnection.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM pg_auth_members
      WHERE member = (SELECT oid FROM pg_roles WHERE rolname = ${runtimeRole})
    `;
    if (membership.count > 0) {
      throw new Error(
        `Role ${runtimeRole} has inherited role memberships; remove them before retrying.`,
      );
    }
  }

  const password = crypto.randomBytes(32).toString("base64url");
  const safePassword = password.replaceAll("'", "''");
  const roleSql = existingRole
    ? `ALTER ROLE ${quoteIdentifier(runtimeRole)} WITH LOGIN PASSWORD '${safePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
    : `CREATE ROLE ${quoteIdentifier(runtimeRole)} WITH LOGIN PASSWORD '${safePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`;

  await migrationConnection.$executeRawUnsafe(roleSql);
  await migrationConnection.$executeRawUnsafe(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(connection.database_name)} TO ${quoteIdentifier(runtimeRole)}`,
  );
  await migrationConnection.$executeRawUnsafe(
    `GRANT USAGE ON SCHEMA ${quoteIdentifier(connection.schema_name)} TO ${quoteIdentifier(runtimeRole)}`,
  );

  await migrationConnection.$executeRawUnsafe(`
    DO $grant_runtime$
    DECLARE table_name text;
    BEGIN
      FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
          AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO %I',
          current_schema(), table_name, '${runtimeRole}'
        );
      END LOOP;
    END
    $grant_runtime$
  `);

  await migrationConnection.$executeRawUnsafe(
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${quoteIdentifier(connection.schema_name)} TO ${quoteIdentifier(runtimeRole)}`,
  );
  await migrationConnection.$executeRawUnsafe(
    `REVOKE UPDATE, DELETE ON TABLE ${quoteIdentifier(connection.schema_name)}."AdminAuditLog" FROM ${quoteIdentifier(runtimeRole)}`,
  );
  await migrationConnection.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quoteIdentifier(connection.schema_name)} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdentifier(runtimeRole)}`,
  );
  await migrationConnection.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quoteIdentifier(connection.schema_name)} GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quoteIdentifier(runtimeRole)}`,
  );

  const runtimeUrl = new URL(configuredRuntimeUrl);
  runtimeUrl.username = runtimeRole;
  runtimeUrl.password = password;

  const runtimeConnection = new PrismaClient({ datasourceUrl: runtimeUrl.toString() });
  try {
    const [securityState] = await runtimeConnection.$queryRaw`
      SELECT
        role.rolsuper AS is_superuser,
        role.rolbypassrls AS bypasses_rls,
        (
          SELECT COUNT(*) = 3
          FROM pg_class table_info
          JOIN pg_namespace schema_info ON schema_info.oid = table_info.relnamespace
          WHERE schema_info.nspname = current_schema()
            AND table_info.relname IN ('Attendance', 'WfhRequest', 'LeaveRequest')
            AND table_info.relrowsecurity
            AND table_info.relforcerowsecurity
            AND EXISTS (
              SELECT 1
              FROM pg_policy policy_info
              WHERE policy_info.polrelid = table_info.oid
            )
        ) AS rls_is_enforced
      FROM pg_roles role
      WHERE role.rolname = current_user
    `;

    if (
      !securityState?.rls_is_enforced ||
      securityState.is_superuser ||
      securityState.bypasses_rls
    ) {
      throw new Error("The new runtime role did not pass the PostgreSQL RLS check.");
    }

    await runtimeConnection.$queryRaw`SELECT 1`;
  } finally {
    await runtimeConnection.$disconnect();
  }

  const migrationUrlValue = new URL(migrationUrl).toString();
  const nextMigrationEnv = setEnvValue(
    migrationEnvContents,
    "MIGRATION_DATABASE_URL",
    migrationUrlValue,
  );
  const nextRuntimeEnv = setEnvValue(
    envContents,
    "DATABASE_URL",
    runtimeUrl.toString(),
  );

  fs.writeFileSync(migrationEnvPath, nextMigrationEnv, { encoding: "utf8", mode: 0o600 });
  fs.writeFileSync(envPath, nextRuntimeEnv, { encoding: "utf8", mode: 0o600 });

  console.log(
    `Configured ${runtimeRole} as the non-superuser runtime role. The privileged migration URL is stored separately in ignored backend/.env.migrations.`,
  );
} finally {
  await migrationConnection.$disconnect();
}
