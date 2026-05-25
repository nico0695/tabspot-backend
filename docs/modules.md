# Feature Module Breakdown

## Overview

The backend follows Feature-Driven Development. Each domain is a self-contained NestJS module under `src/modules/`. Shared infrastructure lives in `src/common/` and `src/config/`.

Modules export only what other modules need. Internal services, repositories, and use-cases stay encapsulated. Cross-module communication happens through standard NestJS dependency injection.

## Module Map

```
src/modules/
├── auth/          # Identity verification and user management
├── catalog/       # Artists and songs (public catalog bounded context)
├── genres/        # Genre listing
├── tabs/          # Tab lifecycle (CRUD, submission, moderation, ratings)
├── admin/         # Administrative operations
├── search/        # Full-text search
└── health/        # Service health check
```

---

## Auth Module

**Path:** `src/modules/auth/`

**Exports:** AuthService, AuthGuard, OptionalAuthGuard, RolesGuard, IDENTITY_PROVIDER, UserRepository

**Responsibility:** Verifies Supabase JWT tokens, syncs users to the local database, manages user profiles.

**Key files:**

| File | Role |
|------|------|
| `auth.service.ts` | User sync (lookup-or-create), profile updates, active status check |
| `auth.module.ts` | Exports guards and services for other modules |
| `adapters/supabase-identity.adapter.ts` | JWT verification (HS256/ES256/RS256) |
| `repositories/user.repository.ts` | User CRUD, pagination, role/status changes |
| `controllers/me.controller.ts` | GET/PATCH /me endpoints |
| `ports/identity-provider.port.ts` | IIdentityProvider interface |

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user profile |
| PATCH | `/me` | Update current user profile |

**Depends on:** PrismaModule

---

## Catalog Module

**Path:** `src/modules/catalog/`

**Exports:** ArtistService, SongService, ArtistRepository, SongRepository, SongGenreRepository

**Responsibility:** Serves the public artist and song catalog with related metadata, tab counts, and genre associations, while also exposing catalog persistence services needed by admin catalog CRUD.

**Internal structure:**

```text
src/modules/catalog/
├── artists/       # Artist-facing controller, service, DTOs, tests
├── songs/         # Song-facing controller, service, DTOs, tests
├── shared/        # Minimal neutral shared contracts only
├── repositories/  # Module-level persistence layer
└── catalog.module.ts
```

**Structure rules:**

- `artists/` and `songs/` own their application-layer files and tests.
- DTOs are grouped by intent under `dto/queries` and `dto/responses`.
- `shared/` stays minimal and should not absorb entity-specific contracts.
- `repositories/` stays common to the module, with one repository per entity or significant relation.
- Explicit file names and explicit imports are preferred over barrels.

**Key files:**

| File | Role |
|------|------|
| `artists/artist.service.ts` | Artist listing, detail by slug, select data |
| `songs/song.service.ts` | Song listing with filters, detail by slug with tabs |
| `repositories/artist.repository.ts` | Cursor pagination, slug lookup, offset admin pagination |
| `repositories/song.repository.ts` | Complex filtering (artist, genre, search), tab count aggregation |
| `repositories/song-genre.repository.ts` | Atomic genre replacement for songs |
| `artists/artists-public.controller.ts` | GET /artists/all, GET /artists, GET /artists/:slug |
| `songs/songs-public.controller.ts` | GET /songs/all, GET /songs, GET /songs/:slug |
| `shared/dto/queries/pagination-query.schema.ts` | Minimal shared query contract reused across catalog |

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/artists/all` | All artists (select format) |
| GET | `/artists` | Paginated artist listing |
| GET | `/artists/:slug` | Artist detail by slug |
| GET | `/songs/all` | All songs (select format) |
| GET | `/songs` | Paginated song listing with filters |
| GET | `/songs/:slug` | Song detail by slug (includes tabs) |

**Depends on:** PrismaModule, TabsModule (for published tab data)

**Growth note:** `CatalogModule` is the reference pattern for a single FDD module that grows internally through subfeatures before being split into multiple Nest modules.

---

## Genres Module

**Path:** `src/modules/genres/`

**Exports:** GenresService, GenreRepository

**Responsibility:** Genre listing for browsing and filtering.

**Key files:**

| File | Role |
|------|------|
| `genres.service.ts` | Genre listing, select data |
| `repositories/genre.repository.ts` | Cursor pagination, CRUD, song association counting |
| `genres-public.controller.ts` | GET /genres/all, GET /genres |

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/genres/all` | All genres (select format) |
| GET | `/genres` | Paginated genre listing |

**Depends on:** PrismaModule

---

## Tabs Module

**Path:** `src/modules/tabs/`

**Exports:** TabsService, TAB_REPOSITORY

**Responsibility:** Core business logic -- tab creation, editing, submission workflow, moderation, and ratings.

**Architecture:** Uses ports and adapters (ITabRepository) and use-case classes for status transitions.

**Key files:**

| File | Role |
|------|------|
| `tabs.service.ts` | Orchestrates all tab operations, ownership checks, visibility rules |
| `services/tab-rating.service.ts` | Rating CRUD, aggregate calculation |
| `repositories/prisma-tab.repository.ts` | ITabRepository implementation, complex queries |
| `repositories/tab-rating.repository.ts` | Rating upsert, aggregation |
| `use-cases/create-tab.use-case.ts` | Creates DRAFT tab |
| `use-cases/submit-tab.use-case.ts` | DRAFT/REJECTED to PENDING transition |
| `use-cases/publish-tab.use-case.ts` | PENDING to PUBLISHED transition |
| `use-cases/reject-tab.use-case.ts` | PENDING to REJECTED transition |
| `ports/tab-repository.port.ts` | ITabRepository interface |
| `constants/tab-status-transitions.ts` | Valid status transition map |
| `controllers/tabs-public.controller.ts` | GET /tabs, GET /tabs/:id |
| `controllers/tabs-user.controller.ts` | POST/GET/PUT/DELETE /me/tabs/* |
| `controllers/tabs-rating-public.controller.ts` | GET /tabs/:id/rating |
| `controllers/tabs-rating-user.controller.ts` | POST /tabs/:id/rate, GET /me/tabs/:id/rating |

**Status Machine:**

```
DRAFT --> PENDING --> PUBLISHED
  ^
  |
  REJECTED ----> PENDING
```

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tabs` | No | Paginated published tabs |
| GET | `/tabs/:id` | No | Tab detail |
| GET | `/tabs/:id/rating` | No | Tab rating aggregate |
| POST | `/me/tabs` | User | Create new tab (DRAFT) |
| GET | `/me/tabs` | User | List own tabs |
| PUT | `/me/tabs/:id` | User | Update own tab |
| POST | `/me/tabs/:id/submit` | User | Submit tab for review |
| DELETE | `/me/tabs/:id` | User | Soft-delete own tab |
| POST | `/tabs/:id/rate` | User | Rate a published tab |
| GET | `/me/tabs/:id/rating` | User | Get own rating for a tab |

**Depends on:** PrismaModule, AuthModule

---

## Admin Module

**Path:** `src/modules/admin/`

**Exports:** None (internal)

**Responsibility:** Platform administration -- tab moderation, user management, catalog CRUD.

**All endpoints require:** AuthGuard + RolesGuard(ADMIN)

**Structure (internal subfeatures):**

```text
src/modules/admin/
├── tabs/                  # Admin tab CRUD + moderation
│   ├── controllers/
│   ├── services/
│   └── dto/{requests,queries,responses}
├── users/                 # Admin user management
│   ├── controllers/
│   ├── services/
│   └── dto/{requests,queries,responses}
├── dashboard/             # Admin dashboard metrics
│   ├── controllers/
│   ├── services/
│   └── dto/responses
├── catalog-management/    # Admin management of artists/genres/songs
│   ├── artists/
│   ├── genres/
│   ├── songs/
│   └── shared/
└── shared/
    └── dto/responses      # Cross-subfeature admin response contracts
```

**Key files:**

| File | Role |
|------|------|
| `tabs/services/admin-tabs.service.ts` | Tab moderation + admin tab CRUD orchestration |
| `users/services/admin-users.service.ts` | User role/status changes + paginated listing |
| `dashboard/services/admin-dashboard.service.ts` | Dashboard metrics aggregation |
| `catalog-management/artists/services/admin-artists.service.ts` | Artist CRUD rules and slug conflict checks |
| `catalog-management/genres/services/admin-genres.service.ts` | Genre CRUD rules and association guards |
| `catalog-management/songs/services/admin-songs.service.ts` | Song CRUD rules, genre validation, and published-tab deletion guard |
| `tabs/controllers/admin-tabs.controller.ts` | Full admin tab CRUD plus moderation endpoints |
| `users/controllers/admin-users.controller.ts` | GET/PATCH /admin/users/* |
| `dashboard/controllers/admin-dashboard.controller.ts` | GET /admin/dashboard |
| `catalog-management/artists/controllers/admin-artists.controller.ts` | CRUD /admin/artists/* |
| `catalog-management/genres/controllers/admin-genres.controller.ts` | CRUD /admin/genres/* |
| `catalog-management/songs/controllers/admin-songs.controller.ts` | CRUD /admin/songs/* |
| `shared/dto/responses/admin-paginated.schema.ts` | Shared admin offset-paginated response contracts |

**Admin growth guardrails:**

- Keep one `AdminModule` while the bounded context remains cohesive.
- New DTO files must be created under the owning subfeature (`requests`, `queries`, or `responses`), never in a flat global DTO folder.
- Keep `shared/` minimal and cross-cutting only.
- Prefer explicit imports; do not introduce barrel files for admin DTOs/responses.
- Cross-subfeature collaboration must use explicit shared contracts, not lateral imports of sibling internals.

**Business rules:**

- Admin cannot change their own role or status (self-change protection).
- Admin tabs detail can retrieve soft-deleted tabs; public tab reads still hide soft-deleted records.
- Admin tab create uses the current admin as author; later patch does not allow song/author reassignment.
- Admin tab list/detail embed lightweight `song` and enriched `author` relation payloads for admin UI consumption.
- Artist deletion blocked if artist has active songs.
- Genre deletion blocked if genre has song associations.
- Song deletion blocked if song has published tabs.
- Slug auto-generated from name, uniqueness enforced.

**Endpoints:** 17 admin endpoints covering dashboard, tabs, users, artists, genres, and songs.

**Depends on:** AuthModule, TabsModule, CatalogModule, GenresModule

---

## Search Module

**Path:** `src/modules/search/`

**Exports:** None (internal)

**Responsibility:** Unified full-text search across artists, songs, and published tabs.

**Key files:**

| File | Role |
|------|------|
| `search.service.ts` | Parallel queries across 3 entity types |
| `search.controller.ts` | GET /search |

**Search behavior:** Case-insensitive contains search. Artists matched by name, songs by title, tabs by song title (published only). Returns grouped results with type-specific fields.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Unified search (throttled at 30 req/min) |

**Depends on:** PrismaModule

---

## Health Module

**Path:** `src/modules/health/`

**Exports:** None (internal)

**Responsibility:** Service liveness check.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status, timestamp, uptime }`. Skips rate limiting. |

**Depends on:** None

---

## Shared Infrastructure

**Path:** `src/common/`

Not a module, but provides cross-cutting concerns used by all feature modules.

| Directory | Contents |
|-----------|----------|
| `guards/` | AuthGuard, OptionalAuthGuard, RolesGuard |
| `decorators/` | @CurrentUser(), @Roles() |
| `filters/` | HttpExceptionFilter (global error handler) |
| `middlewares/` | RequestIdMiddleware (request tracing) |
| `utils/` | Cursor pagination encoding, slugify |
| `constants/` | Throttle rate configs (WRITE: 20/min, SEARCH: 30/min) |
| `openapi/` | Error response schemas, API error response decorators |

---

## Dependency Graph

```
health  (standalone)

search --> PrismaModule

genres --> PrismaModule

auth ----> PrismaModule

catalog -> PrismaModule
        -> TabsModule

tabs ----> PrismaModule
        -> AuthModule

admin ---> AuthModule
        -> TabsModule
        -> CatalogModule
        -> GenresModule
```

All feature modules that need database access depend on PrismaModule. The Admin module sits at the top of the dependency graph, consuming services from most other modules.
