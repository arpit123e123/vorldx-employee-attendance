# VorldX Attendance

VorldX Attendance is a multi-company attendance system with an Admin/HR dashboard, an employee mobile app, and a separate office QR display.

## Project layout

- `backend/` — Express API, Prisma schema, migrations, and database scripts.
- `admin-web/` — React/Vite company dashboard.
- `employee-app-temp/` — React Native/Expo employee app source.
- `qr-display/` — React/Vite office QR display.
- `deploy/load-balancer/` — Docker Compose stack with Nginx and two API instances.
- `docs/` — architecture, API, database, security, test, and change documentation.

## Local development

1. Install Node.js and PostgreSQL, then install dependencies with `npm ci` in each app directory.
2. Configure `backend/.env` from `backend/.env.example`; set up PostgreSQL and run `npm run db:deploy` from `backend/`.
3. Configure each frontend's `.env` from its `.env.example` with the local API URL.
4. Start the backend with `npm run dev` in `backend/`, and the web/mobile apps with their package scripts.

The backend refuses startup if required company migrations or forced row-level security are missing, or if the runtime PostgreSQL role can bypass RLS. See [database setup](docs/database.md) before running migrations and [testing and operations](docs/testing.md) for verification commands.

## Production deployment

Use [the load-balancer guide](deploy/load-balancer/README.md) for the single-host Nginx setup with two API containers. It requires a production `.env.docker`, a TLS certificate, and an already-migrated PostgreSQL database. Deploy static apps separately and configure their HTTPS API URLs.

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Database and migrations](docs/database.md)
- [Security](docs/security.md)
- [Testing and operations](docs/testing.md)
- [Changelog](docs/changelog.md)
