
import prisma from "./prisma.js";

export async function connectDB() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  const [companySchema] = await prisma.$queryRaw`
    SELECT
      to_regclass(format('%I.%I', current_schema(), 'Company')) IS NOT NULL AS company_table_exists,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'companyId'
      ) AS user_company_id_exists,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'isCompanyOwner'
      ) AS user_company_owner_exists
  `;
  if (!companySchema?.company_table_exists || !companySchema?.user_company_id_exists || !companySchema?.user_company_owner_exists) {
    throw new Error('Company registration database migration is missing. Run `npm run db:deploy` in backend and restart the API.');
  }

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

  if (!securityState) {
    throw new Error("Could not determine PostgreSQL runtime role security.");
  }

  if (securityState.is_superuser || securityState.bypasses_rls) {
    throw new Error(
      "PostgreSQL application role must not be a superuser or have BYPASSRLS. Configure DATABASE_URL to use a restricted runtime role.",
    );
  }

  if (!securityState.rls_is_enforced) {
    throw new Error(
      "PostgreSQL RLS is not enabled and forced on Attendance, WfhRequest, and LeaveRequest. Run `npm run db:deploy` in backend.",
    );
  }

  console.log("PostgreSQL connected through Prisma");
}
