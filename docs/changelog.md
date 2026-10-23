# Changelog

This file tracks notable project behavior and operational changes. Dates are omitted where a release date was not recorded.

## Unreleased

- Added a single-host Nginx load-balancer deployment with TLS, two API containers, passive upstream failover, Docker health checks, and shared per-IP login/registration limits on the Nginx instance.
- Scoped WFH and leave management queries and PostgreSQL RLS policies to the employee's company.
- Reduced the backend login IP rate-limit ceiling from 5,000 to 100 attempts per 15 minutes per process.
- Added project API, architecture, database, security, and testing documentation.

## Existing capabilities

- Added company registration with an initial owner/Admin account and company-scoped employee and shift management.
- Added employee QR attendance check-in/out, WFH requests, leave requests, and late-arrival reporting.
- Added forced PostgreSQL RLS checks, admin audit logging, Turnstile verification, security headers, input bounds, and production HTTPS configuration checks.

See the ordered SQL migration history in `backend/prisma/migrations/` for database changes.
