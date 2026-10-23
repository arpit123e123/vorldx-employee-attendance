# Nginx load balancer

This Compose stack runs two API containers behind Nginx. API containers are only exposed on the private Compose network; public HTTP/HTTPS ports belong to Nginx. Nginx balances requests with `least_conn`, retries failed connections, redirects HTTP to HTTPS, and serves TLS. Docker health checks gate Nginx startup, while Nginx passively removes failing upstreams for a short cooldown.

The Nginx login and company-registration limits use shared worker memory on this load balancer: 10 login requests/minute per client IP (burst 5) and 2 registrations/minute (burst 2). Backend per-process limits remain as a secondary safeguard. These counters are shared across Nginx workers, not across multiple load-balancer hosts.

## Run

1. Copy `.env.docker.example` to `.env.docker` and enter the production database URL, strong secrets, public HTTPS origins, and Turnstile values. The database must already have all Prisma migrations applied and allow network access from Docker.
2. Put a valid TLS certificate chain at `certs/fullchain.pem` and its key at `certs/privkey.pem`.
3. From this directory, run `docker compose up --build -d`.
4. Check `docker compose ps`, `docker compose logs load-balancer`, and `https://<your-host>/api/health`.

The API containers set `TRUST_PROXY_HOPS=1`: Express trusts only the immediately connected Nginx proxy, which overwrites the forwarded protocol and appends the client address. Do not publish API container ports directly. If another proxy is placed in front of Nginx, restrict its network access and configure Nginx real-IP handling for that proxy's exact source CIDRs before relying on client-IP rate limits.

For a managed external TLS/load-balancer, terminate TLS there and adapt this Nginx TLS listener/forwarded-header setup to that topology. Do not set a broad Express trust-proxy value. Multiple Nginx hosts need a shared rate-limit store such as Redis and an external health-checked upstream configuration; this Compose file is a single-host, two-API-instance setup.

Apply database migrations using the existing migration workflow before starting new API containers; the runtime database role should remain restricted and must not own tables or bypass RLS.
