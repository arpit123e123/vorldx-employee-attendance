# Database

## PostgreSQL and Prisma

The application uses PostgreSQL through Prisma. The Prisma schema is `backend/prisma/schema.prisma`; migrations live under `backend/prisma/migrations/`. Core models are:

- `Company`: tenant name, unique slug/email, active state.
- `User`: employee identity, email, password hash, role, active state, company membership, and company-owner flag.
- `Shift`: company-owned schedule and assigned employees.
- `Attendance`: employee/date check-in and check-out, arrival details, and company ID. One attendance row per employee per date.
- `WfhRequest` and `LeaveRequest`: employee requests and reviewer/status metadata; company is resolved through the employee relationship.
- `QrSession`: hashed QR session token, creator, expiry, and selected shifts.
- `AdminAuditLog`: administrative action metadata and actor.

## Tenant isolation

Authenticated requests that access attendance, WFH, or leave records use `rlsContext` to run database work in a transaction with local `app.user_id`, `app.user_role`, and `app.company_id` settings. Forced row-level security policies allow employees to access their own request/attendance records and Admin/HR accounts to access records within their company. Controller queries also scope management operations by company.

The runtime DB role must be a non-superuser and must not have `BYPASSRLS`. It must not own the RLS-protected tables. The API checks database schema and these role/RLS conditions on startup. Do not connect the API using the migration/database-owner credentials.

## Local setup and migrations

From `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
# Set DATABASE_URL for the local PostgreSQL database.
npm run db:deploy
npm run prisma:generate
npm run db:runtime-role
npm run db:check
```

The local runtime-role script creates/uses the restricted `vorldx_runtime` role and keeps the privileged migration URL in ignored `.env.migrations`. Review its prompts/output and restart the API after configuring the runtime URL. In production, run migrations as a separate deployment step with a migration credential; give the running API only the restricted runtime URL.

For a new schema change, update `schema.prisma`, create and review a migration, then run `npm run db:deploy` in the target environment. Do not edit a migration already applied to a shared database; add a follow-up migration instead.

## Company schema recovery and deployment safety

The migration history contains two initial migrations (`20261020033424_init_postgresql` and `20261020041415_init`) followed by request, RLS, company-registration, and company-scoped RLS migrations. The two initial migrations overlap and must be treated as an existing deployed history, not rewritten in place. The company-registration migration adds the tenant models and relationships; the later RLS migration adjusts request policies. Never mark migrations applied or roll back by hand without first comparing the target database's `_prisma_migrations` rows and actual catalog/schema.

Before deployment to any existing database:

1. Take and verify a restorable backup/snapshot; pause writes if the recovery plan requires it.
2. Record the database identity, migration history, schema, and row counts for `Company`, `QRSession`, `_ShiftToUser`, and company-related columns. Keep these records secure.
3. Review every pending migration SQL against that database. If a pending migration drops tenant tables/relations or columns, stop deployment and prepare a new additive repair migration that restores the intended schema and reconciles data from a known-good backup or validated mapping.
4. Test the exact upgrade and restore procedure on a recent isolated production clone. Do not run reset, drop, truncate, destructive `migrate dev`, or unreviewed SQL against production.
5. Deploy using the migration credential, inspect the resulting schema and row counts, then start the app using only the restricted runtime role.

Fresh databases should receive the checked-in migration sequence with `prisma migrate deploy`. Existing databases must first be classified by their recorded migration history; do not replay the sequence blindly or use `migrate reset`. This repository has no access to production migration records or backups, so whether any migration was applied and whether dropped data can be recovered must be established by the database operator before deployment.

## Backups and operations

The repository does not configure managed backups, point-in-time recovery, or a production connection pooler. Configure those at the PostgreSQL provider and test restore procedures. Size database connection capacity for both API replicas and use a provider pooler where appropriate.
