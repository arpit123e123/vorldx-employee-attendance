# API reference

Base path: `/api`. JSON request bodies are limited to 128 KiB. Protected requests use `Authorization: Bearer <token>`. Unless noted, successful responses use `{ "success": true, "data": ... }`; errors include `success: false` and a message.

## Authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API process health response. |
| GET | `/auth/captcha-config` | Public | CAPTCHA widget configuration. |
| POST | `/auth/company-register` | Public + Turnstile | Register a company and its owner; does not log the owner in. |
| POST | `/auth/login` | Public + Turnstile + rate limited | Sign in with either `employeeId` or `email`, plus `password`; returns bearer token and public user. |
| GET | `/auth/me` | Signed in | Return the current account. |

Company registration accepts `companyName`, `name`, `email`, and `password`. Password must be 12–72 bytes. Login accepts exactly one of `employeeId` or `email` and `password`.

## Employees and shifts

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/employees` | Admin/HR | List employees. Company-linked accounts are scoped to their company. |
| POST | `/employees` | Admin | Create an employee. |
| POST | `/employees/company-user` | Company owner | Create a company account with an assigned role. |
| PATCH | `/employees/:id/status` | Admin/HR | Activate/deactivate a permitted employee account. |
| PATCH | `/employees/:id/role` | Admin | Change a permitted company user's role. |
| GET | `/shifts` | Admin/HR | List shifts. Company-linked accounts are scoped to their company. |
| POST | `/shifts` | Admin/HR | Create a shift and optionally assign employees. |
| PATCH | `/shifts/:id/status` | Admin/HR | Activate/deactivate a shift. |
| GET | `/shifts/my-shift` | Signed in | Get the current employee's assigned shift. |

Employee creation requires `name`, `email`, and `password`; company-user creation also accepts the allowed `role`. Shift creation uses `name`, `startTime`, `endTime`, and optional `assignedEmployees`.

## Attendance and reports

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/attendance/history` | Signed in | Current user's attendance history. |
| GET | `/attendance/summary` | Signed in | Current user's attendance summary; optional `from` and `to` date query parameters. |
| GET | `/attendance/late-arrival/me/daily` | Signed in | Current user's daily late status; optional `date`. |
| GET | `/attendance/late-arrival/me/monthly` | Signed in | Current user's monthly late summary; optional `month` (`YYYY-MM`). |
| GET | `/attendance/records` | Admin/HR | Paginated company attendance records; `page` and `limit` (default 500, maximum 500). |
| GET | `/attendance/late-arrival/reports/range` | Admin/HR | Late arrival report; `from` and `to` required. |
| GET | `/attendance/late-arrival/reports/daily` | Admin/HR | Daily report; optional `date`. |
| GET | `/attendance/late-arrival/reports/monthly` | Admin/HR | Monthly report; optional `month` (`YYYY-MM`). |

## QR attendance

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/qr/display/session` | Display secret + Turnstile + rate limited | Create an HttpOnly QR-display session cookie. Body: `secret`. |
| POST | `/qr/display/generate` | QR-display session | Generate the next office QR payload. |
| POST | `/qr/generate` | Admin/HR | Generate an office QR payload. |
| POST | `/qr/verify` | Signed-in employee | Verify a QR payload and check in/out. Body includes the QR `token`. |

QR payloads are short-lived. The display credential and employee QR token are separate credentials and must not be logged or committed.

## WFH and leave requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/wfh-requests/me` | Employee | List own WFH requests. |
| POST | `/wfh-requests` | Employee | Submit a WFH request (`date`, `reason`). |
| GET | `/wfh-requests` | Admin/HR | List requests for the caller's company; optional `status`. |
| PATCH | `/wfh-requests/:id/status` | Admin/HR | Approve/reject a company request (`status`, optional `reviewNote`). |
| GET | `/leave-requests/me` | Employee | List own leave requests. |
| POST | `/leave-requests` | Employee | Submit leave (`leaveType`, `startDate`, `endDate`, `reason`). |
| GET | `/leave-requests` | Admin/HR | List requests for the caller's company; optional `status`. |
| PATCH | `/leave-requests/:id/status` | Admin/HR | Approve/reject a company request (`status`, optional `reviewNote`). |

Allowed request statuses are `pending`, `approved`, and `rejected`; review operations accept `approved` or `rejected`. Date values use `YYYY-MM-DD`. Validation limits and duplicate/overlap behavior are enforced by the controllers.

## Rate limits and errors

The local Nginx load-balancer configuration applies shared per-IP limits to login and company registration on that Nginx host. Backend Express limits are also active, but their memory counters are per API process. A multi-host load-balancer requires a shared store for consistent limits.

Legacy Admin/HR accounts without a `companyId` retain compatibility behavior on some employee and shift list endpoints. Assign them to the correct company or retire them before using those accounts in a multi-company deployment.

Common status codes: `400` invalid input, `401` missing/invalid credentials, `403` insufficient role or disallowed origin, `404` missing/invisible resource, `409` duplicate or already-reviewed operation, `429` rate limit, and `500` unexpected server error. API responses include a request ID header (`X-Request-Id`) for diagnosis.
