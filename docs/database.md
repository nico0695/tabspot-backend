# Database Schema

## Overview

| Property         | Value                                      |
|------------------|--------------------------------------------|
| Engine           | PostgreSQL 16                              |
| ORM              | Prisma 7 with `@prisma/adapter-pg`         |
| Extensions       | `pg_trgm` (trigram full-text search)       |
| Generated client | `src/generated/prisma/` (gitignored)       |
| Migrations       | `prisma/migrations/`                       |
| Seed             | `prisma/seed.ts` (executed via `tsx`)       |

Regenerate the client after any schema change:

```bash
npx prisma generate
```

---

## Entity-Relationship Diagram

```
+-----------+     +-----------+     +-------------+
|  Artist   |----<|   Song    |----<|    Tab      |
+-----------+     +-----------+     +-------------+
                       |                 |    |
                       |                 |    |
                  +----+------+   +------+--+ |
                  | SongGenre |   |TabRating | |
                  +----+------+   +------+--+ |
                       |                |     |
                  +----+-----+    +-----+--+  |
                  |  Genre   |    |  User  |--+
                  +----------+    +--------+
```

**Relations:**

- Artist 1 -> N Song
- Song 1 -> N Tab
- Song N -> N Genre (via SongGenre join table)
- Tab N -> 1 User (author)
- Tab N -> 1 User (moderator, nullable)
- Tab 1 -> N TabRating
- User 1 -> N TabRating

---

## Models

### User

Table: `users`

| Column          | Type        | Constraints            |
|-----------------|-------------|------------------------|
| id              | UUID        | PK, default generated  |
| supabaseAuthId  | UUID        | Unique                 |
| email           | Text        | Unique                 |
| displayName     | Text        | Nullable               |
| role            | UserRole    | Default: `USER`        |
| status          | UserStatus  | Default: `ACTIVE`      |
| blockedAt       | Timestamptz | Nullable               |
| createdAt       | Timestamptz | Default: `now()`       |
| updatedAt       | Timestamptz | Auto-updated           |

---

### Artist

Table: `artists`

| Column    | Type        | Constraints              |
|-----------|-------------|--------------------------|
| id        | UUID        | PK                       |
| name      | Text        |                          |
| slug      | Text        | Unique                   |
| sortName  | Text        | Nullable                 |
| createdAt | Timestamptz |                          |
| updatedAt | Timestamptz |                          |
| deletedAt | Timestamptz | Nullable (soft-delete)   |

**Indexes:** `deletedAt`, GIN index on `name` (`pg_trgm`).

---

### Genre

Table: `genres`

| Column    | Type        | Constraints              |
|-----------|-------------|--------------------------|
| id        | UUID        | PK                       |
| name      | Text        |                          |
| slug      | Text        | Unique                   |
| createdAt | Timestamptz |                          |
| updatedAt | Timestamptz |                          |
| deletedAt | Timestamptz | Nullable                 |

---

### Song

Table: `songs`

| Column      | Type        | Constraints              |
|-------------|-------------|--------------------------|
| id          | UUID        | PK                       |
| artistId    | UUID        | FK -> Artist             |
| title       | Text        |                          |
| slug        | Text        | Unique per artist        |
| subtitle    | Text        | Nullable                 |
| releaseYear | SmallInt    | Nullable                 |
| createdAt   | Timestamptz |                          |
| updatedAt   | Timestamptz |                          |
| deletedAt   | Timestamptz | Nullable                 |

**Indexes:** `artistId`, `deletedAt`, GIN on `title` (`pg_trgm`), composite `(artistId, slug)`.

---

### SongGenre

Table: `song_genres`

| Column    | Type        | Constraints              |
|-----------|-------------|--------------------------|
| songId    | UUID        | FK -> Song, cascade del  |
| genreId   | UUID        | FK -> Genre, cascade del |
| createdAt | Timestamptz |                          |

**Primary key:** composite `(songId, genreId)`.
**Indexes:** `(genreId, songId)`.

---

### Tab

Table: `tabs`

| Column            | Type        | Constraints                        |
|-------------------|-------------|------------------------------------|
| id                | UUID        | PK                                 |
| songId            | UUID        | FK -> Song (restrict delete)       |
| authorUserId      | UUID        | FK -> User (restrict delete)       |
| moderatedByUserId | UUID        | FK -> User, nullable (set null)    |
| titleOverride     | Text        | Nullable                           |
| content           | Text        | ChordPro notation                  |
| tabType           | TabType     |                                    |
| instrument        | Instrument  |                                    |
| difficulty        | Difficulty  |                                    |
| status            | TabStatus   | Default: `DRAFT`                   |
| submittedAt       | Timestamptz | Nullable                           |
| publishedAt       | Timestamptz | Nullable                           |
| moderationNotes   | Text        | Nullable                           |
| versionNumber     | Int         | Default: `1`                       |
| createdAt         | Timestamptz |                                    |
| updatedAt         | Timestamptz |                                    |
| deletedAt         | Timestamptz | Nullable                           |

**Indexes:** `songId`, `authorUserId`, `tabType`, `instrument`, `difficulty`, `deletedAt`, composite `(status, deletedAt, createdAt)`, composite `(songId, status)`.

---

### TabRating

Table: `tab_ratings`

| Column    | Type     | Constraints              |
|-----------|----------|--------------------------|
| id        | UUID     | PK                       |
| tabId     | UUID     | FK -> Tab (cascade del)  |
| userId    | UUID     | FK -> User (cascade del) |
| rating    | SmallInt | Range: 1-5               |
| createdAt | Timestamptz |                       |
| updatedAt | Timestamptz |                       |

**Unique constraint:** `(tabId, userId)`.
**Indexes:** `userId`, `tabId`.

---

## Enums

| Enum         | Values                                     |
|--------------|--------------------------------------------|
| UserRole     | `USER`, `ADMIN`                            |
| UserStatus   | `ACTIVE`, `BLOCKED`                        |
| TabType      | `CHORDS`, `TAB`, `MIXED`                   |
| Instrument   | `GUITAR`, `BASS`, `UKULELE`, `PIANO`       |
| Difficulty   | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`     |
| TabStatus    | `DRAFT`, `PENDING`, `PUBLISHED`, `REJECTED`|

---

## Conventions

- **Soft Delete.** Artist, Genre, Song, and Tab use a `deletedAt` column. The PrismaService extension auto-filters deleted records on reads and converts `delete` operations to `update` (setting `deletedAt`).
- **Naming.** Properties are camelCase in TypeScript. Prisma maps them to snake_case SQL table names via `@@map`.
- **UUIDs.** All primary keys are UUID v4, generated by the database.
- **Timestamps.** Every table carries `createdAt` and `updatedAt` columns using `timestamptz`.
- **Foreign Keys.** Core references (Tab -> Song, Tab -> Author) use restrict-on-delete to prevent orphaned data. Junction tables (SongGenre) and ratings use cascade-on-delete.

---

## Seed Data

The seed script (`prisma/seed.ts`) populates:

- 14 canonical genres: Rock, Pop, Blues, Jazz, Metal, Country, Folk, Reggae, Punk, Classical, Electronic, R&B, Latin, Funk.
- Sample artists and songs for local development.

Run the seed:

```bash
npx prisma db seed
```

---

## Commands

| Command                     | Description                          |
|-----------------------------|--------------------------------------|
| `npx prisma migrate dev`   | Create and apply migration (dev)     |
| `npx prisma migrate deploy`| Apply pending migrations (production)|
| `npx prisma db seed`       | Run the seed script                  |
| `npx prisma generate`      | Regenerate the Prisma client         |
| `npx prisma studio`        | Launch the visual database browser   |
