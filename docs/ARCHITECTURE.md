# TabSpot Backend — Architecture

## About this document

This file is the **authoritative** reference for backend architecture and code organization.
Its companion is [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md), which covers the developer journey
(setup, branching, commits, PRs, tests).

Background docs (read for context, not authority):

- [`docs/tab-spot.prd.md`](./tab-spot.prd.md) — product definition (entities, enums, user roles).
- [`docs/backend-mvp.md`](./backend-mvp.md) — Sprint 1 technical breakdown.
- [`docs/initial-idea.md`](./initial-idea.md) — stack decisions and roadmap.
- [`docs/ARCH_IDEA.md`](./ARCH_IDEA.md), [`docs/ARCH_COMPARISON.md`](./ARCH_COMPARISON.md),
  [`docs/ARCH_DECISION.md`](./ARCH_DECISION.md) — historical decision trail.

For working with Claude Code on this repo, see [`CLAUDE.md`](../CLAUDE.md).

> **Authority note.** Where this document disagrees with the `ARCH_*` trio, this document wins.
> The `ARCH_*` files are background and may be removed in a separate change once this doc is stable.

---

## Architectural style

**Híbrido pragmático refinado + hexagonal selectivo.**

Feature-Driven Development (one module per domain feature) with a layered internal structure
(`controller → service → repository`). `use-cases/` are added only when the module's domain
warrants them (≥2 non-trivial business rules or ≥3 domain states). **Ports and adapters
(hexagonal) are added selectively, only where they pay** — today: `tabs` (testable workflow)
and `auth` (replaceable identity provider). Catalog and similar CRUD-shaped modules stay flat.

### Explicitly rejected styles

- **Clean / Hexagonal puro** — over-engineered for a CRUD-heavy domain.
- **Vertical Slice puro** — non-idiomatic in NestJS; fights the framework.
- **CQRS** — no read/write asymmetry justifies it for the MVP.
- **Microservices** — out of scope; design as a modular monolith that *could* be split.
- **Custom `DomainError` hierarchies** — use native Nest `HttpException` subclasses instead.
- **TSyringe** — Nest's built-in DI is sufficient.
- **`express-async-errors`** — Nest already handles async errors.

---

## Folder layout

```text
src/
├── common/                              # cross-cutting (used by ≥2 modules)
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── env.schema.ts                    # Zod schema for process.env
│   ├── app.config.ts                    # registerAs('app', () => env) namespaces
│   └── config.module.ts
├── prisma/                              # global Prisma module
│   ├── prisma.service.ts                # $extends for soft delete
│   └── prisma.module.ts
├── modules/
│   ├── catalog/                         # FDD plano + repository (CRUD-shaped)
│   │   ├── dto/
│   │   │   ├── create-artist.schema.ts
│   │   │   └── create-artist.dto.ts
│   │   ├── repositories/
│   │   │   ├── artist.repository.ts
│   │   │   └── __tests__/
│   │   │       └── artist.repository.spec.ts
│   │   ├── catalog.controller.ts
│   │   ├── catalog.service.ts
│   │   └── catalog.module.ts
│   ├── tabs/                            # FDD + use-cases + ports/adapters (workflow)
│   │   ├── controllers/
│   │   │   ├── tabs-public.controller.ts     # /api/v1/tabs
│   │   │   ├── tabs-user.controller.ts       # /api/v1/me/tabs
│   │   │   └── tabs-admin.controller.ts      # /api/v1/admin/tabs
│   │   ├── dto/
│   │   │   ├── public/
│   │   │   ├── user/
│   │   │   └── admin/
│   │   ├── ports/
│   │   │   └── tab-repository.port.ts
│   │   ├── repositories/
│   │   │   └── prisma-tab.repository.ts      # implements TabRepositoryPort
│   │   ├── use-cases/
│   │   │   ├── create-tab.use-case.ts
│   │   │   ├── publish-tab.use-case.ts
│   │   │   └── __tests__/
│   │   │       └── publish-tab.use-case.spec.ts
│   │   ├── constants/
│   │   ├── utils/                            # parseChordPro, extractChords, ...
│   │   ├── tabs.service.ts                   # thin orchestration
│   │   └── tabs.module.ts
│   ├── auth/                            # guards + identity port/adapter
│   │   ├── guards/
│   │   │   ├── auth.guard.ts                 # validates Supabase JWT
│   │   │   └── roles.guard.ts
│   │   ├── ports/
│   │   │   └── identity-provider.port.ts
│   │   ├── adapters/
│   │   │   └── supabase-identity.adapter.ts  # implements IdentityProviderPort
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   └── admin/                           # orchestrates other modules via use-cases
│       ├── use-cases/
│       ├── admin.controller.ts
│       └── admin.module.ts
├── app.module.ts
└── main.ts
```

> Tests live as `__tests__/` subfolders **inside each layer** (e.g.,
> `src/modules/tabs/repositories/__tests__/tab.repository.spec.ts`). End-to-end tests live under
> the top-level `test/` directory. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for commands.

---

## Layer rules

| Layer | Responsibility | Notes |
|---|---|---|
| **Controller** | HTTP boundary | Never holds business logic. Delegates to service or use-case. |
| **Service** | Orchestration, ownership checks, transaction boundaries | Reads/writes go through repositories, never through `PrismaService` directly. |
| **Repository** | Sole holder of Prisma queries for one entity | **Always present**, one per persisted entity, in every module — including CRUD-shaped ones. |
| **Use-case** | Single business operation | Added only when the module has ≥2 non-trivial business rules **or** ≥3 domain states. Today: `tabs`, `admin`. |
| **Port / Adapter** | Hexagonal boundary | **Selective only.** Today: `tabs` (`TabRepositoryPort`), `auth` (`IdentityProviderPort`). Do **not** add ports for `PrismaService`, `ConfigService`, `Logger`, or hypothetical notifications. |

### Cross-module rules

- `common/` vs module: shared in `common/` once **used by ≥2 modules**; otherwise start in the module.
- **Module-to-module imports**: only via the other module's barrel (the `*.module.ts` re-exports
  and exported types). Reaching into `modules/<other>/internals/...` is forbidden.
- `admin/` is the **controlled exception**: it may import use-cases from other modules to orchestrate.
- **DI scope**: singleton (`@Injectable()`) by default. `REQUEST` / `TRANSIENT` only with a documented reason.

---

## Audience separation (public / `/me` / `/admin`)

The product surfaces three audiences (anonymous public, authenticated user, admin backoffice)
over the **same domain**. They are **not** separate bounded contexts — they consume one set of
entities (`Tab`, `Artist`, `Song`, …).

### Rule

- **One module per domain entity, NOT one per audience.**
- Audiences are split inside the module via separate controllers when ≥2 audiences consume it.
- DTOs may also be split per audience when response shapes diverge (e.g., admin sees `deletedAt`,
  public never does).

### File pattern

```text
src/modules/tabs/
├── controllers/
│   ├── tabs-public.controller.ts        # no auth        → /api/v1/tabs
│   ├── tabs-user.controller.ts          # AuthGuard      → /api/v1/me/tabs
│   └── tabs-admin.controller.ts         # AuthGuard + RolesGuard(ADMIN) → /api/v1/admin/tabs
├── dto/
│   ├── public/
│   ├── user/
│   └── admin/
├── ...
└── tabs.module.ts
```

The service and use-cases are **shared** across audiences; the differences live at the controller
and DTO layer only.

---

## Folder root naming

Use `src/modules/` today.

> **Promotion rule.** Rename `modules/` to `contexts/` **only when 4+ bounded contexts exist**
> (signals: `tabs`, `catalog`, `identity`, `moderation`, `social`…). The rename is a mechanical
> `git mv`; defer it until the count is real.

---

## Path aliases and import order

Mandatory aliases (already configured in `tsconfig.json`):

- `@src/*` → `src/*`
- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`

**Deep relative imports (`../../...`) are forbidden.**

Import order, separated by blank lines:

1. External packages (`@nestjs/common`, `zod`, …)
2. Aliased imports (`@modules/...`, `@common/...`, …)
3. Relative imports (`./tabs.service`, …)

---

## Data layer (Prisma)

- `PrismaService` is **global**; injected **only** into repositories.
- **Soft delete** uses Prisma Client Extensions (`$extends`) globally in `PrismaService`.
  The extension auto-filters `deletedAt: null` on `find` / `update` / `delete`. An explicit
  bypass method (e.g., `prisma.tab.findManyIncludingDeleted(...)` or a tagged `includeDeleted`
  argument) is exposed for admin and audit reads.
  **Legacy Prisma middleware (`prisma.$use(...)`) is forbidden.**
- **Indexes**: every foreign key is indexed; `deletedAt` is indexed; public search fields
  (e.g., normalized song/artist titles) are indexed.
- **Migrations**: `prisma migrate dev` locally; `prisma migrate deploy` in CI/prod. Naming is
  descriptive snake or kebab (e.g., `add_tabs_table`, `add_deleted_at_index_to_tabs`).
- **Seeds**: `prisma/seed.ts`. Base seed loads the canonical genre and instrument lists.
- **ChordPro storage**: tabs are stored as **raw `TEXT` content**. The backend never parses
  ChordPro; the Next.js frontend parses at render time.
- **Transactions** (Post-MVP convention): when ≥2 writes must be atomic, use
  `prisma.$transaction(async (tx) => { ... })` (callback form). Array form is reserved for
  read-only batches.

---

## Environment and config

- `src/config/env.schema.ts` defines a single **Zod schema** for `process.env`.
- Bootstrap (`main.ts`) calls `EnvSchema.safeParse(process.env)` **before** Nest starts.
  On failure, log `error.flatten()` to stderr and `process.exit(1)`.
- Config is exposed via `registerAs('app', () => env)` namespaces. The type is derived from
  the Zod schema with `z.infer`; `configService.get<string>('FOO')` (string-typed lookups)
  is forbidden.
- `.env.example` is committed and kept in lockstep with `env.schema.ts`. CI grep enforcement
  is a Sprint 1 follow-up.

```ts
// src/config/env.schema.ts
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_PUBLIC_KEY: z.string().min(1),
  ENABLE_DOCS: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof EnvSchema>;
```

---

## API conventions

### Versioning

- `app.setGlobalPrefix('api')` plus URI versioning `v1` from Sprint 1.
- All routes live under `/api/v1/*`.
- **Audience subprefixes**:
  - `/api/v1/<resource>` — public (no auth).
  - `/api/v1/me/<resource>` — authenticated user.
  - `/api/v1/admin/<resource>` — admin (`AuthGuard` + `RolesGuard(ADMIN)`).
- Breaking changes introduce `/api/v2/*` **alongside** `/api/v1/*`. `v1` is deprecated explicitly
  before removal (announce window + sunset header).

### Response shape

- **List endpoints** return an envelope: `{ data: [...], pageInfo: { ... } }`.
- **Detail / create / update endpoints** return the **raw resource object** — no envelope.

```json
// GET /api/v1/tabs  →  list (envelope)
{
  "data": [
    { "id": "tab_...", "title": "Wonderwall", "artistId": "art_..." }
  ],
  "pageInfo": { "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

```json
// GET /api/v1/tabs/tab_abc  →  detail (raw)
{
  "id": "tab_abc",
  "title": "Wonderwall",
  "artistId": "art_..."
}
```

### Error shape

All errors share one shape:

```json
{
  "error": {
    "code": "TAB_NOT_FOUND",
    "message": "Tab with id tab_abc not found",
    "fields": [{ "field": "title", "message": "min 1 char" }]
  }
}
```

- `code` is a project-defined `SCREAMING_SNAKE` token (e.g., `TAB_NOT_FOUND`,
  `FORBIDDEN_ACTION`, `VALIDATION_FAILED`).
- A global `HttpExceptionFilter` maps Nest `HttpException` subclasses to this shape.
- `ZodValidationException` (from `nestjs-zod`) becomes `code: VALIDATION_FAILED` with
  `fields[]` derived from `error.flatten().fieldErrors`.
- Domain errors throw **native** Nest `HttpException` subclasses (`NotFoundException`,
  `ForbiddenException`, `ConflictException`, `BadRequestException`, …). The `code` is passed
  as a structured payload to the exception. **No custom `DomainError` hierarchy.**

### HTTP codes

| Code | Use when |
|---|---|
| `200` | Successful read or update returning a body. |
| `201` | Successful resource creation; body returns the created resource. |
| `204` | Successful action with no body (e.g., delete). |
| `400` | Generic bad request (rare; prefer `422` for validation). |
| `401` | Missing or invalid authentication. |
| `403` | Authenticated but not authorized (role or ownership). |
| `404` | Resource not found, or hidden by soft-delete to the current audience. |
| `409` | Conflict with current state (e.g., duplicate slug). |
| `422` | Validation failed (`ZodValidationException`). |
| `500` | Unexpected server error; never from a known `HttpException` subclass. |

### Pagination

- **Public listings** are **cursor-based**. Query params: `?cursor=<opaque-base64>&limit=<n>`.
  Response includes `pageInfo.nextCursor` and `pageInfo.hasMore`. Default `limit` is `20`,
  hard cap `100`.
- **Admin listings** are **offset-based**. Query params: `?page=<n>&pageSize=<n>`.
  Response includes `pageInfo.total` and `pageInfo.hasMore`.
- Cursors are opaque base64-encoded payloads (e.g., `{ id, createdAt }`); clients must
  treat them as opaque.

---

## Validation stack (Zod end-to-end)

- **Library**: `nestjs-zod`. `ZodValidationPipe` is registered globally in `main.ts`.
- **`class-validator` and `class-transformer` are forbidden.**
- **File pattern** under `src/modules/<feature>/dto/`:
  - `<name>.schema.ts` — the raw Zod schema.
  - `<name>.dto.ts` — the `createZodDto(...)` class consumed by controllers and Swagger.
- Types are derived **only** via `z.infer<typeof Schema>`. Parallel `interface` declarations
  are forbidden.
- IDs use **branded types** (e.g., `z.string().uuid().brand<'TabId'>()`) to prevent passing
  the wrong ID at function boundaries.
- **Coercion and transformation rules**:
  - `z.coerce.number()` / `z.coerce.boolean()` / `z.coerce.date()` for query params (always strings).
  - `.transform(...)` for normalization (`trim`, `toLowerCase` for emails, …).
  - `.default(...)` for defaults — declared in the **schema**, never in the controller.
- `z.any()` and `z.unknown()` are forbidden outside explicitly documented boundaries.
- Schemas are declared at **module scope** (singleton). Never inside a request handler.

> **Frontend sharing reservation.** Public response schemas (e.g., `TabResponseSchema`,
> `ArtistResponseSchema`) are kept exportable so they can move to a future `@tabspot/contracts`
> package shared with the Next.js frontend without rewriting.

```ts
// src/modules/tabs/dto/create-tab.schema.ts
import { z } from 'zod';

export const CreateTabSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artistId: z.string().uuid().brand<'ArtistId'>(),
  content: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
});

export type CreateTabInput = z.infer<typeof CreateTabSchema>;
```

```ts
// src/modules/tabs/dto/create-tab.dto.ts
import { createZodDto } from 'nestjs-zod';

import { CreateTabSchema } from './create-tab.schema';

export class CreateTabDto extends createZodDto(CreateTabSchema) {}
```

---

## Authentication and authorization

- **Strategy**: Supabase Auth (JWT). The `AuthGuard` validates the JWT signature against
  Supabase's public key (`SUPABASE_JWT_PUBLIC_KEY` from env).
- **User sync**: lookup-on-first-authenticated-request **or** a Supabase webhook — to be
  decided in a Sprint 2 follow-up. Both options are kept open.
- **Roles**: `enum UserRole { USER, ADMIN }`. `MODERATOR` is reserved for a later sprint.
- **Authorization**: `RolesGuard` + `@Roles(UserRole.ADMIN)` decorator gate role-restricted
  endpoints.
- **Current user**: `@CurrentUser()` decorator extracts the user from the request context.
- **Ownership**: "user only edits / deletes own tabs" is checked in the **service**, not in
  the guard (guards do not have business context).

---

## Logging and observability

- **Library**: Pino + `nestjs-pino`. **JSON** in prod, **pretty-printed** in dev.
- **Request id**: a middleware injects `x-request-id` (generates one if absent) and
  propagates it to every log line of the request via the logger context.
- **Levels**:
  - `error` — action required (failed write, integration timeout, unexpected throw).
  - `warn` — recoverable degradation (retry succeeded, fallback path taken).
  - `info` — lifecycle and business events (request start/end, publish-tab, role assigned).
  - `debug` — dev-only diagnostics (off in prod by default).
- **Never log**:
  - tokens, passwords, full `Authorization` headers.
  - full email addresses (mask: `n***@example.com` if needed at `info`).
  - ChordPro content bodies (potentially copyrighted).
  - Supabase service keys.
- **Health checks** (`/health`, `@nestjs/terminus`): Sprint 4. Out of scope today.
- **Metrics** (Prometheus / OpenTelemetry) and **distributed tracing**: out of scope.

---

## OpenAPI / Swagger

- Enabled from Sprint 1 at `/api/docs` in dev.
- **Production gated** by env flag `ENABLE_DOCS` (default: `false`). Documented in `env.schema.ts`.
- Schema generation uses `nestjs-zod` plus `zod-to-openapi`. Decorators `@ApiTags` and
  `@ApiResponse` are used **where they add value**, not blanket-applied to every endpoint.

---

## Testing (cross-link)

Tests live as `__tests__/` folders **inside each layer** of each module
(e.g., `src/modules/tabs/repositories/__tests__/tab.repository.spec.ts`). End-to-end tests
live under the top-level `test/` directory. The CI coverage gate is **80% global**
(lines, branches, functions, statements). See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for
commands, mocks policy, fixtures convention, and exclude patterns.

---

## Code quality (cross-link)

Load-bearing rules enforced by tooling:

- **ESLint** errors that must be respected: `explicit-function-return-type`,
  `explicit-module-boundary-types`, `no-explicit-any`, `no-floating-promises`,
  `no-misused-promises`, `no-unused-vars` with `argsIgnorePattern: '^_'`.
- **TypeScript strict flags**: `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`.
- **Prettier**: single quotes, trailing commas, 100-col width, semicolons.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full list and editor configuration.

---

## Post-MVP and out-of-scope

| Topic | Status |
|---|---|
| Full-text search (`tsvector` over song / artist titles) | Sprint 2+. |
| Transactions convention (`$transaction` callbacks vs. array form) | Post-MVP. Today: callback form for ≥2 atomic writes. |
| Cache (Redis) | Sprint 4 only if pain emerges. |
| Rate limiting (`@nestjs/throttler`) | Sprint 4 only if pain emerges. |
| Event bus / queues (BullMQ) | Only when async processing actually appears. |
| Feature flags | When staging and production are split. |
| Health checks (`/health`, `@nestjs/terminus`) | Sprint 4. |
| Metrics (Prometheus), distributed tracing (OpenTelemetry) | Out of scope for MVP. |
| CQRS, microservices | **Explicitly rejected.** |
| Custom `DomainError` hierarchy, TSyringe, `express-async-errors` | **Explicitly rejected.** |

---

## Authority and maintenance

This document is authoritative. `ARCH_IDEA.md` / `ARCH_COMPARISON.md` / `ARCH_DECISION.md`
are background and may be removed in a separate change once this doc proves stable.

When a rule here is updated, also update the corresponding bullets in
`sdd-lite/skill-catalog.md` under `## Project Standards (auto-resolved)` so downstream
tooling stays aligned.
