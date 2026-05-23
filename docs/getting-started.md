# Getting Started

Developer onboarding guide for the TabSpot backend.

## Prerequisites

- **Node.js** >= 20 (22 LTS recommended)
- **pnpm** — install globally: `npm install -g pnpm`
- **Docker and Docker Compose** — required for PostgreSQL containers
- **A Supabase project** — needed for JWT authentication; see `docs-v2/AUTHENTICATION.md`

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd tabspot-backend
pnpm install
```

### 2. Environment configuration

```bash
cp .env.example .env
```

Key variables to configure:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://tabspot:tabspot@localhost:5432/tabspot` |
| `DATABASE_URL_TEST` | Test database connection | `postgresql://tabspot:tabspot@localhost:5433/tabspot_test` |
| `SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_JWT_PUBLIC_KEY` | JWT verification key | From Supabase dashboard |
| `PORT` | Server port | `4000` |
| `ENABLE_DOCS` | Enable Swagger UI | `true` |

Full variable reference: `docs-v2/CONFIGURATION.md`

### 3. Start the database

```bash
pnpm run db:up
```

This starts two PostgreSQL 16 containers:

- `tabspot-postgres` on port 5432 (development)
- `tabspot-postgres-test` on port 5433 (testing)

### 4. Run migrations and seed

```bash
npx prisma generate          # generate Prisma client
npx prisma migrate dev       # apply migrations
npx prisma db seed           # populate initial data (genres, sample artists/songs)
```

### 5. Start the dev server

```bash
pnpm run start:dev
```

The server starts at `http://localhost:4000` (or your configured PORT value).

### 6. Verify

```bash
curl http://localhost:4000/api/v1/health
# { "status": "ok", "timestamp": "...", "uptime": ... }
```

If `ENABLE_DOCS=true`, visit `http://localhost:4000/api/docs` for Swagger UI.

## Common Development Tasks

### Run tests

```bash
pnpm run test               # unit tests
pnpm run test:e2e           # e2e tests (requires db:up)
pnpm run test:cov           # coverage report
pnpm jest src/path/file.spec.ts  # single file
```

### Code quality

```bash
pnpm run lint               # ESLint with auto-fix
pnpm run format             # Prettier
pnpm run typecheck          # TypeScript strict check
```

### Database operations

```bash
pnpm run db:up              # start containers
pnpm run db:down            # stop containers
npx prisma studio           # visual database browser (http://localhost:5555)
npx prisma migrate dev --name <name>  # create new migration
```

### Build for production

```bash
pnpm run build              # compile to dist/
pnpm run start:prod         # run from dist/main.js
```

## Git Hooks (pre-commit)

The project uses Husky with pre-commit hooks that run:

1. `pnpm run lint` -- ESLint
2. `tsc --noEmit` -- Type check
3. `pnpm run test` -- Full test suite

Commit messages are validated by commitlint against Conventional Commits format.

## Path Aliases

Use these instead of relative imports:

```typescript
import { AuthGuard } from '@common/guards/auth.guard';
import { TabsService } from '@modules/tabs/tabs.service';
import { Env } from '@config/env.schema';
```

Aliases are defined in `tsconfig.json`:

- `@src/*` -- `src/*`
- `@modules/*` -- `src/modules/*`
- `@common/*` -- `src/common/*`
- `@config/*` -- `src/config/*`

## Troubleshooting

- **Port already in use** -- Change `PORT` in `.env` or stop the conflicting process.
- **Prisma client not found** -- Run `npx prisma generate`.
- **Database connection refused** -- Ensure Docker containers are running (`pnpm run db:up`).
- **JWT verification fails** -- Check that `SUPABASE_URL` and `SUPABASE_JWT_PUBLIC_KEY` match your Supabase project settings.
- **E2E tests fail with wrong DB** -- Ensure `DATABASE_URL_TEST` points to port 5433, not 5432.
