# Security

## Authentication and authorization

- Protected API requests use a signed HS256 JWT, then reload the active user and current role from PostgreSQL. Authorization does not depend on a stale role embedded in a token.
- Passwords are hashed with bcrypt. Login and company registration have validation limits and server-side Turnstile verification.
- Admin, HR, company-owner, and employee routes have role checks. Company queries and database policies scope access to the user's company where applicable.
- Attendance, WFH, and leave tables use forced PostgreSQL row-level security (RLS). API startup fails when protections are missing or the runtime role can bypass them.

## Network and request protections

- Production config requires strong JWT/QR display secrets, PostgreSQL TLS, HTTPS web origins, Turnstile credentials, and rejects HTTP requests at the API.
- Helmet sets API security headers. CORS uses the configured allowlist; API responses are marked `no-store`.
- JSON bodies are capped at 128 KiB. Controllers validate identifiers, dates, pagination, and request text. Prisma parameterizes normal database operations.
- Admin changes use an audit log that avoids passwords, request bodies, leave reasons, and QR secrets.

## Rate limiting and load balancer

- Backend Express login, identity, authenticated-user, and QR-display-session limits use the default in-memory store. Counters are separate in each API process.
- The included single-host Nginx configuration adds worker-shared per-IP limits: login 10 requests/minute with burst 5, company registration 2 requests/minute with burst 2. This adds a shared edge limit for both API replicas on that host.
- Do not expose API containers directly. Nginx forwards the TLS protocol and client address; Compose sets Express to trust exactly one proxy hop.
- These controls do not share counters across multiple Nginx hosts. A multi-host topology needs shared rate-limit storage and explicit trusted proxy CIDRs/client-IP configuration.
- The Nginx stack is not host-level high availability. Production availability also depends on a resilient load-balancer host, database capacity/backups, and monitoring.

## Deployment checklist

1. Use `NODE_ENV=production`, unique random secrets of at least 32 bytes, PostgreSQL TLS, exact HTTPS CORS/QR origins, and production Turnstile keys/hostnames.
2. Apply migrations with a separate migration credential. Run the API with a non-superuser PostgreSQL role that has no `BYPASSRLS` and does not own protected tables.
3. For the included Compose deployment, create `deploy/load-balancer/.env.docker` from its example, supply a valid certificate/key pair under `certs/`, and keep API service ports private.
4. Set Admin, QR display, and employee app API URLs to the public HTTPS endpoint. Protect environment files and TLS private keys; do not commit them.
5. Re-run the dependency audit when npm registry access is available. The most recent attempted `npm audit` could not reach the registry, so current advisory status is unknown.
6. Run the checks in [testing.md](testing.md), then perform deployment-specific load and failover checks. No production load test or multi-host LB test has been completed here.

## Known limits

- The Admin web app stores its bearer token in browser `localStorage`. A future XSS bug could expose it; keep dependencies current and avoid rendering untrusted HTML.
- No upload or webhook endpoints are implemented, so their file validation and signature verification are not applicable yet.
- Legacy Admin/HR users without a `companyId` retain compatibility behavior on some employee and shift list endpoints. Review, assign, or retire such accounts before enabling multiple tenants; do not treat their legacy list behavior as company isolation.
- Backend Express rate counters are process-local. Nginx limits help in the included single-host setup; counters are not distributed to other Nginx hosts.
- This repository does not configure database backups or recovery; configure and verify those with the database provider.
