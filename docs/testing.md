# Testing and operations

## Available automated checks

Run commands from the relevant project directory.

### Backend

```powershell
cd backend
npm test
npm run db:check
```

`npm test` uses Node's built-in test runner. At the time of this documentation update, the backend test suite contains no test files, so a passing run only confirms test discovery completed. `db:check` connects to PostgreSQL and checks runtime-role and forced-RLS state.

### Admin dashboard and QR display

```powershell
cd admin-web
npm ci
npm run build

cd ../qr-display
npm ci
npm run build
```

### Employee app

The Expo source is in `employee-app-temp/`:

```powershell
cd employee-app-temp
npm ci
npm run lint
```

Address lint errors before release. Review warnings, especially React hook dependency warnings, before changing affected flows.

## Manual end-to-end smoke check

Against a non-production environment with migrations applied:

1. Check `GET /api/health` and verify API startup/database checks succeed.
2. Register a test company, then log in with its owner using employee ID or email. Verify the owner can access the dashboard.
3. Create a test employee and assign a shift; confirm the employee can sign in and sees only their own shift/attendance.
4. Open the QR display session, generate a QR, scan it with the employee account, and verify check-in/out records belong to the correct company.
5. Submit WFH and leave requests as the employee; review them as that company's HR/Admin.
6. Create a second test company and verify its Admin/HR cannot list, review, or infer the first company's requests, shifts, and attendance.
7. Verify deactivated accounts cannot authenticate and unauthorized roles receive `403` responses.
8. Clean up disposable test users, requests, shifts, sessions, and companies.

Do not use real employee data for smoke tests. Ensure the test environment cannot trigger real notifications or payroll workflows.

## Load-balancer checks

From `deploy/load-balancer/`:

```powershell
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs --tail 100 load-balancer
```

Then verify HTTPS `/api/health`, HTTP-to-HTTPS redirect, login/registration `429` limits, routing with both API containers healthy, and recovery after stopping one API container. Do not test rate limits against real users. Docker was not installed in this environment, so Compose/Nginx runtime checks have not been run.

## Last recorded verification

- Backend `npm test`: command passed, but discovered 0 tests.
- Backend `npm run db:deploy` and `npm run db:check`: passed against the configured local PostgreSQL database; restricted runtime role and RLS enforcement were reported.
- Admin dashboard and QR display Vite production builds: passed.
- Employee app lint: 0 errors and 5 warnings at the last run.
- API health returned success on the local API process at the last check.
- `git diff --check`: passed for the latest reviewed changes.
- npm dependency audit could not reach the registry on the last attempt; advisory status was not refreshed.
