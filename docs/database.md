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

## Backups and operations

The repository does not configure managed backups, point-in-time recovery, or a production connection pooler. Configure those at the PostgreSQL provider and test restore procedures. Size database connection capacity for both API replicas and use a provider pooler where appropriate.
