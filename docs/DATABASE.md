# Database

PostgreSQL 16 via Prisma v7. Schema source of truth: `prisma/schema.prisma`. Migration: `prisma/migrations/20260418190900_init/`.

---

## Tables

### `users`
Local application user linked to Supabase Auth. No soft delete — accounts are controlled via `status`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `supabase_auth_id` | `uuid` | Unique. Links to Supabase Auth identity |
| `email` | `text` | Unique. Lowercased at write time |
| `display_name` | `text?` | Optional profile name |
| `role` | `user_role` | `USER` \| `ADMIN`. Default `USER` |
| `status` | `user_status` | `ACTIVE` \| `BLOCKED`. Default `ACTIVE` |
| `blocked_at` | `timestamptz?` | Set when status becomes `BLOCKED` |
| `created_at` / `updated_at` | `timestamptz` | Audit timestamps |

---

### `artists`
Canonical catalog for solo artists and bands. Soft-deletable.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Display name. GIN trigram index for search |
| `slug` | `text` | Unique. Used in public routes |
| `sort_name` | `text?` | Optional normalized name for ordering |
| `deleted_at` | `timestamptz?` | Soft delete |

---

### `genres`
Genre catalog. Soft-deletable. Seeded with 14 canonical genres on first migration.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Display label |
| `slug` | `text` | Unique |
| `deleted_at` | `timestamptz?` | Soft delete |

---

### `songs`
Canonical musical works. One song can have multiple tabs. Soft-deletable.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `artist_id` | `uuid` | FK → `artists.id` (Restrict) |
| `title` | `text` | GIN trigram index for search |
| `slug` | `text` | Unique per artist: `UNIQUE(artist_id, slug)` |
| `subtitle` | `text?` | Optional alternate title |
| `release_year` | `smallint?` | Optional |
| `deleted_at` | `timestamptz?` | Soft delete |

---

### `song_genres`
Join table between `songs` and `genres` (many-to-many). No surrogate PK — composite `(song_id, genre_id)`.

| Column | Type | Notes |
|---|---|---|
| `song_id` | `uuid` | FK → `songs.id` (Cascade) |
| `genre_id` | `uuid` | FK → `genres.id` (Cascade) |
| `created_at` | `timestamptz` | |

---

### `tabs`
User-created ChordPro contributions. Core entity. Soft-deletable.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `song_id` | `uuid` | FK → `songs.id` (Restrict) |
| `author_user_id` | `uuid` | FK → `users.id` (Restrict) |
| `content` | `text` | Raw ChordPro string. Never logged |
| `tab_type` | `tab_type` | `CHORDS` \| `TAB` \| `MIXED` |
| `instrument` | `instrument` | `GUITAR` \| `BASS` \| `UKULELE` \| `PIANO` |
| `difficulty` | `difficulty` | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |
| `status` | `tab_status` | `DRAFT` → `PENDING` → `PUBLISHED` \| `REJECTED` |
| `title_override` | `text?` | Optional custom label over the song title |
| `submitted_at` | `timestamptz?` | Set when author sends for review |
| `published_at` | `timestamptz?` | Set when admin publishes. Required when `status = PUBLISHED` |
| `moderated_by_user_id` | `uuid?` | FK → `users.id` (SetNull). Last moderator |
| `moderation_notes` | `text?` | Admin notes on the moderation decision |
| `version_number` | `integer` | Default `1`. Minimum `1` (check constraint) |
| `deleted_at` | `timestamptz?` | Soft delete |

---

### `tab_ratings`
One rating per authenticated user per tab. No soft delete.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `tab_id` | `uuid` | FK → `tabs.id` (Cascade) |
| `user_id` | `uuid` | FK → `users.id` (Cascade) |
| `rating` | `smallint` | 1–5. Enforced by check constraint |
| `created_at` / `updated_at` | `timestamptz` | |

Unique constraint on `(tab_id, user_id)` — one rating per user per tab.

---

## Relations

```
artists ──< songs ──< tabs >── users
               │
          song_genres
               │
            genres

tabs ──< tab_ratings >── users
```

| From | To | Type | On delete |
|---|---|---|---|
| `songs` → `artists` | many-to-one | Restrict |
| `song_genres` → `songs` | many-to-one | Cascade |
| `song_genres` → `genres` | many-to-one | Cascade |
| `tabs` → `songs` | many-to-one | Restrict |
| `tabs` → `users` (author) | many-to-one | Restrict |
| `tabs` → `users` (moderator) | many-to-one | SetNull |
| `tab_ratings` → `tabs` | many-to-one | Cascade |
| `tab_ratings` → `users` | many-to-one | Cascade |

**Restrict** on core ownership FKs prevents accidental hard-deletion of a parent that has children.
**Cascade** on pure join and support tables (`song_genres`, `tab_ratings`).
**SetNull** on the moderator pointer so deleting a moderator account doesn't orphan the tab.

---

## Soft Delete

`artists`, `genres`, `songs`, and `tabs` have a `deleted_at` column. Deletion is logical — rows are never physically removed by application code.

`PrismaService` applies a global `$extends` query interceptor that:
- **Automatically filters** `deleted_at = NULL` on all `find*`, `update*`, `count`, and `aggregate` operations.
- **Rewrites** `delete` / `deleteMany` to set `deleted_at = now()` instead of issuing a real `DELETE`.
- **Bypass**: pass `where: { includeDeleted: true }` to skip the filter (for admin / audit reads).

`users` and `tab_ratings` are **not** soft-deleted. User accounts are controlled via `status = BLOCKED`.

---

## Search Indexes

Full-text fuzzy search is powered by the `pg_trgm` extension (enabled in the first migration).

| Table | Column | Index type | Use case |
|---|---|---|---|
| `artists` | `name` | GIN trigram | Artist name search with typo tolerance |
| `songs` | `title` | GIN trigram | Song title search with typo tolerance |

Queries use `ILIKE '%q%'` or `similarity()` — the GIN index makes these fast even on large tables.

> `tsvector` full-text search is intentionally not included in the MVP. It would be useful for searching tab content (ChordPro), but that use case is both legally sensitive and low value for now.

---

## Check Constraints

| Table | Constraint | Rule |
|---|---|---|
| `tab_ratings` | `tab_ratings_rating_check` | `rating BETWEEN 1 AND 5` |
| `tabs` | `tabs_version_number_check` | `version_number >= 1` |
| `tabs` | `tabs_published_at_check` | `status <> 'PUBLISHED' OR published_at IS NOT NULL` |

These are enforced at the database level — Prisma does not generate them from the schema DSL, so they live as raw SQL in the migration file.

---

## Conventions

- **Primary keys**: `UUID` on every table. Non-guessable, works well with Supabase distributed identity.
- **Naming**: `camelCase` in Prisma / TypeScript; `snake_case` in SQL. All fields use `@map`, all models use `@@map`.
- **Timestamps**: `TIMESTAMPTZ` everywhere. Always timezone-aware.
- **Tab content**: `content TEXT` stores raw ChordPro strings. The frontend parses them at render time. Never log this field.

---

## Seed Data

`pnpm prisma db seed` loads 14 canonical genres (idempotent — safe to re-run):

Rock, Pop, Metal, Folk, Jazz, Blues, Country, Reggae, Punk, Alternative, Electronic, Hip-Hop, R&B, Classical
