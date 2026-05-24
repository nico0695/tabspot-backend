# Deployment Guide

## Overview

TabSpot backend now includes repository-owned production artifacts for a VPS deploy:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.prod.yml`
- `.env.production.example`
- `.github/workflows/main.yml`

The current production path is:

- build on the VPS through Docker Compose
- run migrations explicitly through a `migrator` service
- publish the API only on `127.0.0.1:4004`
- place Nginx on the host in front of that upstream

GHCR is intentionally deferred to a later follow-up.

---

## Target Architecture

```
┌─────────────────────────────────────────┐
│                   VPS                    │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │  Reverse  │  │   API    │  │  DB   │ │
│  │  Proxy    │──│ Container│──│Postgres│ │
│  │(Caddy/Nginx)│ │(Node 22) │  │  16   │ │
│  └──────────┘  └──────────┘  └───────┘ │
│       │              │                   │
│     HTTPS        Host 4004 -> Ctn 3000  │
└───────┼─────────────────────────────────┘
        │
    Internet
```

The reverse proxy terminates TLS and forwards traffic to the API service through the host
loopback binding `127.0.0.1:4004`, which maps to container port `3000`.
PostgreSQL is only accessible within the Docker network; it is never exposed to the
public internet.

---

## Prerequisites (Production)

- VPS with Docker and Docker Compose installed.
- Reverse proxy already configured on the VPS (Nginx in the current target setup).
- Domain name with DNS A record pointing to the VPS IP.
- Supabase project configured for production use.
- SSH access to the VPS using key-based authentication (password auth disabled).

---

## Environment Variables (Production)

| Variable               | Production Value                                  |
|------------------------|---------------------------------------------------|
| `NODE_ENV`             | `production`                                      |
| `PORT`                 | `3000`                                            |
| `DATABASE_URL`         | `postgresql://tabspot:<password>@postgres:5432/tabspot` |
| `SUPABASE_URL`         | Production Supabase URL                           |
| `SUPABASE_JWT_PUBLIC_KEY` | Production JWT key                             |
| `CORS_ORIGINS`         | `https://yourdomain.com` (required, no wildcards) |
| `CORS_CREDENTIALS`     | `false`                                           |
| `REQUEST_BODY_LIMIT`   | `256kb`                                           |
| `THROTTLE_TTL`         | `60`                                              |
| `THROTTLE_LIMIT`       | `100`                                             |
| `ENABLE_DOCS`          | `false`                                           |

Never commit `.env.production` to the repository. The current workflow writes it on the
VPS from GitHub Secrets; if you manage it manually, keep restricted permissions (`chmod 600`).

---

## Dockerfile

The committed `Dockerfile` is a multi-stage build:

### Stage 1 -- Dependencies

- Base image: `node:22-alpine`.
- Enable Corepack and activate pnpm.
- Copy `package.json`, `pnpm-lock.yaml`.
- Run `pnpm install --frozen-lockfile`.

### Stage 2 -- Build

- Copy full source tree from the project.
- Run `pnpm run prisma:generate` to produce the Prisma Client.
- Run `pnpm run build` to compile TypeScript to `dist/`.

### Stage 3 -- Runtime

- Start from a fresh `node:22-alpine`.
- Copy `dist/`, production `node_modules`, and the Prisma schema from previous stages.
- Install production dependencies only: `pnpm install --frozen-lockfile --prod --ignore-scripts`.
- Set `NODE_ENV=production`.
- Entry point: `node dist/main`.

Key considerations in the current implementation:

- Generate the Prisma Client during the build stage, not at runtime.
- Use `--frozen-lockfile` in every install step to ensure reproducibility.
- Exclude dev dependencies from the final image to reduce attack surface and size.
- Ignore install scripts in the prod dependency stage so development hooks like Husky do not
  break image creation.
- Add a `.dockerignore` file to prevent copying `node_modules`, `.env*`, `dist/`, and
  other unnecessary files into the build context.

---

## Docker Compose (Production)

`docker-compose.prod.yml` currently defines three services:

### api

- Build from the project Dockerfile using the `runtime` target.
- Depends on `postgres` (condition: service_healthy).
- Exposes `127.0.0.1:4004:3000` to the host for Nginx upstreaming.
- Health check: `wget -qO- http://127.0.0.1:3000/api/v1/health >/dev/null || exit 1`.
- Restart policy: `unless-stopped`.
- Reads environment from `.env.production`.

### postgres

- Image: `postgres:16-alpine`.
- Persistent named volume mounted at `/var/lib/postgresql/data`.
- Health check: `pg_isready -U tabspot`.
- Not exposed to the host network (internal only).
- Receives only `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` instead of the full
  application env file.

### migrator

- Uses the Docker `builder` target from the same Dockerfile.
- Command: `pnpm run db:migrate:deploy`.
- Depends on `postgres` (condition: service_healthy).
- Exits after migrations complete (no restart).
- Is executed explicitly by the deploy workflow before `api` is recreated.

---

## Database Migrations

| Context      | Command                      | Behavior                              |
|--------------|------------------------------|---------------------------------------|
| Development  | `npx prisma migrate dev`     | Creates and applies migrations        |
| Production   | `npx prisma migrate deploy`  | Applies pending migrations only       |

Production rules:

- Always run migrations before starting the API container.
- Use the separate `migrator` container before recreating `api`.
- Never run `migrate dev` in production -- it can reset data.
- Back up the database before applying migrations to production.

---

## CI/CD Pipeline (GitHub Actions)

### Triggers

- `pull_request` targeting `main` or `develop` -- run CI checks only.
- `push` to `develop` -- run CI checks only.
- `push` to `main` -- run CI checks, then deploy on success.

### CI Steps

1. Check out the repository.
2. Set up pnpm 10.33.0 and Node 22.
3. Install dependencies: `pnpm install --frozen-lockfile`.
4. Start a PostgreSQL service container for testing.
5. Generate the Prisma Client: `pnpm run prisma:generate`.
6. Run migrations against the test database: `pnpm run db:migrate:deploy`.
7. Lint check: `pnpm run lint:check`.
8. Type check: `pnpm run typecheck`.
9. Format check: `pnpm run format:check`.
10. Build: `pnpm run build`.
11. Unit/integration tests: `pnpm run test`.
12. E2E tests: `pnpm run test:e2e`.

### Deploy Steps (after CI passes on main)

### Current deploy flow

```bash
ssh deploy@your-vps "cd /app/tabspot-backend && \
  git fetch --all --prune && \
  git checkout main && \
  git pull --ff-only origin main && \
  docker compose -f docker-compose.prod.yml build && \
  docker compose -f docker-compose.prod.yml run --rm migrator && \
  docker compose -f docker-compose.prod.yml up -d api && \
  curl -fsS http://127.0.0.1:4004/api/v1/health >/dev/null"
```

### Deferred follow-up

GHCR-based image publication remains a follow-up optimization. The current repository layout
is compatible with that migration, but it is not implemented yet.

---

## Health Checks

- **Endpoint:** `GET /api/v1/health`
- **Response:** `{ "status": "ok", "timestamp": "...", "uptime": ... }`
- **Usage:** Docker `HEALTHCHECK`, SSH deploy validation, and external uptime monitors.
- **Current limitation:** The endpoint does not verify database connectivity. A database
  ping check is planned as a future enhancement.

---

## Security Checklist

- [ ] `NODE_ENV=production` is set.
- [ ] `ENABLE_DOCS=false` -- Swagger UI is disabled in production.
- [ ] `CORS_ORIGINS` contains explicit HTTPS origins only (no wildcards).
- [ ] SSH uses key-based authentication; password auth is disabled.
- [ ] Firewall allows only ports 22 (SSH), 80 (HTTP redirect), and 443 (HTTPS).
- [ ] PostgreSQL is not exposed externally (accessible only within the Docker network).
- [ ] Secrets are stored in GitHub Secrets and rendered into `.env.production` on the VPS, or managed manually outside git.
- [ ] Helmet middleware is enabled for HTTP security headers (pending implementation).

---

## Backup Strategy

1. Schedule `pg_dump` via cron on the VPS (daily recommended).
2. Store backups offsite (S3-compatible storage, external server, or similar).
3. Test the restore procedure periodically to confirm backups are valid.
4. Retain at least 7 days of backups.

Example cron entry (daily at 03:00):

```cron
0 3 * * * docker exec tabspot-postgres pg_dump -U tabspot tabspot | gzip > /backups/tabspot-$(date +\%Y\%m\%d).sql.gz
```

---

## Rollback

### Application rollback

1. Identify the previous working commit on `main`.
2. Reset the VPS checkout to that commit or redeploy the earlier revision.
3. Run `docker compose -f docker-compose.prod.yml build`, `docker compose -f docker-compose.prod.yml run --rm migrator` only if schema advancement is still compatible, and `docker compose -f docker-compose.prod.yml up -d api`.

### Database rollback

- Prisma does not support automatic migration rollback.
- To revert a migration: restore the database from a backup taken before the migration.
- Always test migration rollback procedures in a staging environment first.

---

## Monitoring

- **Container health:** Docker `HEALTHCHECK` on the API container restarts it on failure.
- **Uptime monitoring:** Use an external service (UptimeRobot, Better Stack, or similar)
  to poll `GET /api/v1/health` at regular intervals.
- **Log rotation:** Configure the Docker logging driver (`json-file` with `max-size` and
  `max-file` options) to prevent disk exhaustion.
- **Structured logs:** When Pino is adopted, configure JSON output for compatibility with
  log aggregation tools (Loki, Datadog, etc.).

---

## GitHub Secrets

The current GitHub Actions workflow expects:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`
- `VPS_APP_PATH`
- `SUPABASE_URL`
- `SUPABASE_JWT_PUBLIC_KEY`
- `CORS_ORIGINS`
- `PROD_DATABASE_URL`
- `PROD_POSTGRES_USER`
- `PROD_POSTGRES_PASSWORD`
- `PROD_POSTGRES_DB`

## First Admin Bootstrap

This deploy flow does not create an admin automatically.

Recommended MVP procedure:

1. Let the target user sign in once so a local `users` row exists.
2. Connect to PostgreSQL on the VPS.
3. Promote that user manually:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'you@example.com';
```

This keeps bootstrap explicit and avoids shipping a privileged one-off script in the deploy path.
- [ ] Create `.env.production.example` (template without real secrets).
- [ ] Add `lint:check` and `format:check` scripts to `package.json`.
- [ ] Add `engines` and `packageManager` fields to `package.json`.
- [ ] Create GitHub Actions workflow (`.github/workflows/ci.yml`).
- [ ] Configure VPS: install Docker, set up firewall, configure reverse proxy, obtain TLS.
- [ ] Set up automated database backups.
- [ ] Set up external uptime monitoring.
