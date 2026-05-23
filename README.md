# TabSpot Backend

REST API for a tablature and chord platform. Stores musical tabs as raw ChordPro strings; the frontend (Next.js) parses them at render time.

## Tech Stack

| Area            | Technology                    |
|-----------------|-------------------------------|
| Framework       | NestJS 11 (Express)           |
| Language        | TypeScript 5.7 (strict mode)  |
| Database        | PostgreSQL 16                 |
| ORM             | Prisma 7                      |
| Auth            | Supabase Auth (JWT)           |
| Validation      | Zod + nestjs-zod              |
| Logging         | Pino (nestjs-pino)            |
| Build           | SWC                           |
| Testing         | Jest 30                       |
| Docs            | OpenAPI 3.0 / Swagger         |
| Package Manager | pnpm                          |

## Quick Start

```bash
git clone <repo>
cd tabspot-backend
pnpm install
cp .env.example .env          # edit with your values
pnpm run db:up                # start PostgreSQL (Docker)
npx prisma migrate dev        # run migrations
npx prisma db seed            # seed initial data
pnpm run start:dev            # http://localhost:4000/api/v1/health
```

## Project Structure

```
src/
├── bootstrap/     # App setup (CORS, body parser, Swagger, global pipes/filters)
├── common/        # Guards, decorators, filters, middlewares, utils
├── config/        # Environment validation (Zod schema)
├── prisma/        # PrismaService with soft-delete extension
├── modules/
│   ├── auth/      # Supabase JWT verification, user sync, profile
│   ├── catalog/   # Artists and Songs (public read)
│   ├── genres/    # Genre listing
│   ├── tabs/      # Tab CRUD, submission workflow, ratings
│   ├── admin/     # Moderation, user/catalog management
│   ├── search/    # Full-text search
│   └── health/    # Health check
└── generated/     # Prisma client (auto-generated, gitignored)
```

## API Overview

- **12** public endpoints -- catalog browsing, search, tab reading
- **9** authenticated endpoints -- profile, tab creation/submission, ratings
- **13** admin endpoints -- moderation, user management, catalog CRUD
- Full reference: [API-REFERENCE.md](API-REFERENCE.md)
- Swagger UI: `GET /api/docs` (available when `ENABLE_DOCS=true`)

## Scripts

| Command                | Description                    |
|------------------------|--------------------------------|
| `pnpm run start:dev`   | Dev server with watch mode     |
| `pnpm run build`       | Compile to `dist/`             |
| `pnpm run start:prod`  | Run compiled build             |
| `pnpm run prisma:generate` | Generate Prisma client      |
| `pnpm run db:migrate:deploy` | Apply pending Prisma migrations |
| `pnpm run test`        | Unit tests                     |
| `pnpm run test:e2e`    | E2E tests                      |
| `pnpm run test:cov`    | Coverage report (80% threshold)|
| `pnpm run lint`        | ESLint with auto-fix           |
| `pnpm run lint:check`  | ESLint without file mutation   |
| `pnpm run format`      | Prettier                       |
| `pnpm run format:check`| Prettier check only            |
| `pnpm run typecheck`   | TypeScript strict check        |
| `pnpm run db:up`       | Start PostgreSQL containers    |
| `pnpm run db:down`     | Stop containers                |

## Deployment

Production deploy is now repository-backed:

- `Dockerfile` builds the NestJS runtime image.
- `docker-compose.prod.yml` defines `postgres`, `migrator`, and `api`.
- `.github/workflows/main.yml` runs DB-backed CI on `develop`/`main` activity and deploys to the VPS on `push` to `main`.
- The VPS path is expected to be `/app/tabspot-backend`.
- The API is published on the VPS as `127.0.0.1:4004:3000` for Nginx upstreaming.

See [docs/deployment.md](docs/deployment.md) for the production env contract, GitHub secrets, VPS expectations, backup notes, and the manual first-admin bootstrap step.

## Documentation

| Topic          | File                                            |
|----------------|-------------------------------------------------|
| Architecture   | [ARCHITECTURE.md](ARCHITECTURE.md)               |
| API Reference  | [API-REFERENCE.md](API-REFERENCE.md)             |
| Database       | [DATABASE.md](DATABASE.md)                       |
| Getting Started| [GETTING-STARTED.md](GETTING-STARTED.md)         |
| Authentication | [AUTHENTICATION.md](AUTHENTICATION.md)           |
| Modules        | [MODULES.md](MODULES.md)                         |
| Testing        | [TESTING.md](TESTING.md)                         |
| Configuration  | [CONFIGURATION.md](CONFIGURATION.md)             |
| Deployment     | [DEPLOYMENT.md](DEPLOYMENT.md)                   |
| Contributing   | [CONTRIBUTING.md](CONTRIBUTING.md)               |

## License

UNLICENSED -- private project.
