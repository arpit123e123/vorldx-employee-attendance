# Architecture

## Components

```text
Admin dashboard ─┐
Employee app ────┼── HTTPS ── Nginx ── API instance 1 ─┐
QR display ──────┘                    API instance 2 ─┴── PostgreSQL
```

- `admin-web/`: React/Vite interface for company admins and HR.
- `employee-app-temp/`: Expo/React Native app for employees.
- `qr-display/`: React/Vite screen that displays rotating office attendance QR codes.
- `backend/`: Express API, authentication, authorization, business rules, and Prisma access.
- PostgreSQL: application data, company relationships, audit log, and forced RLS policies.
- `deploy/load-balancer/`: optional single-host Docker Compose deployment with TLS terminating at Nginx and two API instances behind it.

## Request flow

The web and mobile clients call the API over HTTPS and send a bearer JWT for protected endpoints. The API reloads the active user and current role from PostgreSQL on each request; authorization does not depend on a stale role embedded in a token. For endpoints using row-level security, `rlsContext` opens a transaction and sets the user ID, role, and company ID with transaction-local PostgreSQL settings. Prisma calls made during that request use that transaction.

Nginx routes requests across API instances using least active connections. It redirects HTTP to HTTPS, enforces per-IP login and company-registration limits in shared worker memory, and forwards requests to private-only API containers. Backend instances use the same PostgreSQL database. Backend in-process limits remain as secondary per-instance limits; they do not share counters between replicas.

## Authentication and main flows

- A company owner registers a company and owner account, then signs in.
- Company owner/Admin creates company users and can assign Admin, HR, or Employee roles as permitted by the account-management rules.
- Employees use a short-lived office QR session to check in/out. Attendance records retain their company ID.
- Employees submit WFH and leave requests; company Admin/HR reviews them.
- Administrative changes are recorded in `AdminAuditLog` without storing passwords, request bodies, or QR secrets.

## Availability and scaling boundaries

The included Nginx stack runs on one Docker host and routes across two API containers. Docker health checks gate initial Nginx startup; Nginx uses passive upstream failure detection after startup. This is not a multi-host high-availability deployment. A host failure still takes down the load balancer and both local API containers. Multiple Nginx hosts require external health-checked routing and shared rate-limit storage. PostgreSQL connection capacity must also be sized for the number of API instances.

The API currently uses Socket.IO in its dependency set; any future multi-instance socket feature must use a cross-instance adapter and compatible session handling.
