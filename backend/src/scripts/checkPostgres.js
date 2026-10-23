
import "dotenv/config";
import prisma from "../config/prisma.js";

try {
  const result = await prisma.$queryRaw`
    SELECT
      current_database() AS database,
      current_timestamp AS server_time
  `;

  console.log("PostgreSQL connected successfully!");
  console.log(result);

  const [securityState] = await prisma.$queryRaw`
    SELECT
      current_user AS database_role,
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

  console.log("Database security status:", {
    databaseRole: securityState.database_role,
    isSuperuser: securityState.is_superuser,
    bypassesRls: securityState.bypasses_rls,
    rlsIsEnforced: securityState.rls_is_enforced,
  });

  if (securityState.rls_is_enforced) {
    const [unscopedRows] = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Attendance") AS attendance,
        (SELECT COUNT(*) FROM "WfhRequest") AS wfh_requests,
        (SELECT COUNT(*) FROM "LeaveRequest") AS leave_requests
    `;
    if (
      unscopedRows.attendance !== 0n ||
      unscopedRows.wfh_requests !== 0n ||
      unscopedRows.leave_requests !== 0n
    ) {
      throw new Error("RLS isolation check failed: rows were visible without a user context.");
    }
    console.log("RLS isolation check: no rows visible without a user context.");
  }

  const [schemaState] = await prisma.$queryRaw`
    SELECT array_agg(tablename ORDER BY tablename) AS tables
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
  `;
  console.log("Application tables:", schemaState.tables || []);
} catch (error) {
  console.error("PostgreSQL connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
