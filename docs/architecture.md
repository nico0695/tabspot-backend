# Architecture

## Overview

TabSpot backend follows a **Pragmatic Refined Hybrid + Selective Hexagonal** architecture.

The system is organized around **Feature-Driven Development**: each domain (Catalog, Tabs, Auth, Admin, Search) lives in a self-contained NestJS module under `src/modules/`. Modules own their controllers, services, repositories, DTOs, and use-cases.

Hexagonal patterns (Ports & Adapters) are applied **selectively**, only where an external dependency boundary justifies the abstraction cost. `ITabRepository` decouples tab persistence from Prisma. `IIdentityProvider` decouples authentication from Supabase. Other modules use Prisma directly through repositories without a formal port layer.

Use-case classes encapsulate complex business operations that carry validation and state-transition logic. Simple CRUD flows stay in services.

---

## Layer Model

```
Request → Middleware → Guard → Controller → Service → Repository/UseCase → Prisma → PostgreSQL
                                                   |
                                             Port/Adapter (selective)
```

### Controllers

HTTP request handling, input validation via Zod DTOs, response mapping. Controllers contain zero business logic. They delegate immediately to services or use-cases and return shaped responses.

### Services

Orchestration layer. Services coordinate repositories, use-cases, and cross-module calls. Business rules that do not warrant a dedicated use-case live here. Services are the primary injection target for controllers.

### Repositories

Data access abstraction over Prisma. Repositories encapsulate raw queries, cursor/offset pagination logic, and soft-delete filtering. They shield services from Prisma-specific syntax and provide a consistent query interface.

### Use Cases

Single-responsibility classes that encapsulate one business operation with its own validation. Examples: `SubmitTabUseCase` validates status transitions before allowing a tab to move from DRAFT to PENDING. Use-cases are injected into services, not called directly by controllers.

### Ports

Interfaces defining contracts for external dependencies. Declared as TypeScript interfaces and resolved via injection tokens.

- `IIdentityProvider` -- verifies JWTs, retrieves user identity from the auth provider.
- `ITabRepository` -- tab persistence contract decoupled from the ORM.

### Adapters

Concrete implementations of ports, swappable without touching business logic.

- `SupabaseIdentityAdapter` implements `IIdentityProvider`.
- `PrismaTabRepository` implements `ITabRepository`.

---

## Module Dependency Graph

```
AppModule
├── AppConfigModule          (global)
├── PrismaModule             (global)
├── ThrottlerModule          (global guard)
├── LoggerModule             (Pino)
├── HealthModule
├── GenresModule
├── AuthModule               exports → AuthService, Guards, UserRepository
├── CatalogModule            imports → TabsModule
├── TabsModule               imports → AuthModule
├── AdminModule              imports → AuthModule, TabsModule, CatalogModule, GenresModule
└── SearchModule
```

Global modules (`AppConfigModule`, `PrismaModule`, `ThrottlerModule`) are registered once at the root and available everywhere without explicit imports. Feature modules declare their dependencies through standard NestJS `imports` arrays.

---

## Audience Separation

The API serves three distinct audiences, each with different access patterns and pagination strategies.

### Public

Routes: `/v1/genres`, `/v1/artists`, `/v1/songs`, `/v1/tabs`, `/v1/search`

No authentication required. Read-only access to the published catalog. All list endpoints use cursor-based pagination.

### User

Routes: `/v1/me/*`

Requires `AuthGuard`. Authenticated users manage their profile, create and edit tabs, submit tabs for review, and rate published tabs. Cursor-based pagination.

### Admin

Routes: `/v1/admin/*`

Requires `AuthGuard` + `RolesGuard(ADMIN)`. Full CRUD over catalog entities, moderation queue for pending tabs, user management. Offset-based pagination with `totalCount` for admin UI tables.

---

## Key Architectural Patterns

### 1. Soft Delete

Applies to: `Artist`, `Genre`, `Song`, `Tab`.

`PrismaService` extends `PrismaClient` with `$extends()` middleware that intercepts `delete` and `deleteMany` operations, converting them to `update({ deletedAt: new Date() })`. All `find` queries automatically filter `deletedAt: null` unless the caller explicitly passes `includeDeleted: true`.

This preserves referential integrity and supports audit trails without physical row removal.

### 2. Cursor-Based Pagination

Used by public and user endpoints. The cursor payload encodes `{ id, sortBy, sortValue }` as a base64url string. This avoids expensive offset scans on large tables.

The cursor is sort-aware: it remembers the sort column and direction, ensuring stable ordering across pages even when sort values are non-unique.

### 3. Offset Pagination

Used by admin endpoints. Traditional `page`/`pageSize` parameters with a `totalCount` in the response for UI pagination controls. Less efficient than cursor pagination but acceptable given admin traffic volumes and the need for random page access.

### 4. Tab Status Machine

```
DRAFT ──→ PENDING ──→ PUBLISHED
  ^
  |
  └─── REJECTED ──→ PENDING
```

Transitions are enforced by use-case classes referencing a constant map `TAB_STATUS_TRANSITIONS`. Each use-case validates that the requested transition is legal before executing it. Invalid transitions return a domain error.

- `SubmitTabUseCase`: DRAFT/REJECTED to PENDING
- `PublishTabUseCase`: PENDING to PUBLISHED
- `RejectTabUseCase`: PENDING to REJECTED

### 5. Audience-Aware Visibility

`TabsService.findPublicDetail()` enforces visibility rules based on tab status and requester identity:

- **PUBLISHED** tabs are visible to all users, authenticated or not.
- **DRAFT**, **PENDING**, and **REJECTED** tabs are visible only to the tab owner or users with the ADMIN role.

This ensures unpublished work is private without requiring separate endpoints.

### 6. Configuration-Driven Behavior

All runtime behavior is determined by environment variables validated with Zod at application startup. Invalid or missing configuration fails fast with descriptive error messages.

Configurable without code changes: logging level, CORS origins, rate limit thresholds, Swagger toggle, request body size limits, database URL, Supabase credentials.

---

## Dependency Injection Patterns

**Standard injection.** Constructor injection of services and repositories via the NestJS DI container. The default pattern for most intra-module dependencies.

**Token-based injection.** `TAB_REPOSITORY` and `IDENTITY_PROVIDER` are custom injection tokens that resolve port interfaces to their concrete adapter implementations. This enables swapping adapters (e.g., for testing) without modifying consuming code.

**Use-case injection.** `CreateTabUseCase`, `SubmitTabUseCase`, `PublishTabUseCase`, and `RejectTabUseCase` are registered as providers and injected into `TabsService`. Each use-case is a single-purpose class with one public `execute()` method.

---

## Cross-Cutting Concerns

| Concern | Implementation | Scope |
|---|---|---|
| Authentication | AuthGuard + SupabaseIdentityAdapter | Per-route |
| Authorization | RolesGuard + @Roles() decorator | Per-route |
| Validation | ZodValidationPipe (global) | All requests |
| Error handling | HttpExceptionFilter (global) | All responses |
| Rate limiting | ThrottlerGuard (global) + per-route overrides | All routes |
| Request tracing | RequestIdMiddleware, x-request-id header | All routes |
| Logging | Pino with PII redaction | All routes |
| Soft delete | PrismaService $extends() | Artist, Genre, Song, Tab |

---

## Path Aliases

```
@src/*      → src/*
@modules/*  → src/modules/*
@common/*   → src/common/*
@config/*   → src/config/*
```

Configured in `tsconfig.json`, `.swcrc`, and `jest.config.ts`. Use these instead of deep relative imports.

---

## Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable description",
    "fields": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
```

The `fields` array is present only for validation errors. Standard error codes:

| Code | HTTP Status |
|---|---|
| VALIDATION_FAILED | 422 |
| BAD_REQUEST | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| INTERNAL_ERROR | 500 |

---

## Decisions and Constraints

| Decision | Rationale |
|---|---|
| ChordPro stored as raw TEXT | Frontend (Next.js) parses at render time. No server-side tree representation. |
| Zod end-to-end, no class-validator | Single validation library for DTOs, config, and OpenAPI schema generation. |
| SWC compiler instead of tsc | Faster build and dev reload cycles. Configured via `.swcrc`. |
| Jest instead of Vitest | Explicit decision during architecture phase. Better NestJS ecosystem support. |
| No Helmet | Planned for production hardening. Not yet added. |
| Single Prisma init migration | Iterative migrations will be added as features grow beyond the initial schema. |
| Selective hexagonal, not universal | Port/Adapter overhead is justified only at true external boundaries (auth provider, potentially the ORM). Internal module-to-module calls use direct injection. |
