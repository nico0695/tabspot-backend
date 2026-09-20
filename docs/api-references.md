# API Reference

Complete endpoint reference for the TabSpot REST API.

---

## General Information

| Property       | Value                                              |
|----------------|----------------------------------------------------|
| Base URL       | `/api/v1`                                          |
| Versioning     | URI-based (`/api/v1/...`)                          |
| Auth           | Bearer token (Supabase JWT) in `Authorization`     |
| Content-Type   | `application/json`                                 |
| Swagger UI     | `GET /api/docs` (when `ENABLE_DOCS=true`)          |

### Rate Limits

| Scope            | Limit         |
|------------------|---------------|
| Global           | 100 req / 60s |
| Write operations | 20 req / 60s  |
| Search           | 30 req / 60s  |

The global limit is env-tunable (`THROTTLE_LIMIT` / `THROTTLE_TTL`, defaults shown).
Write (20) and Search (30) are fixed constants in `@common/constants/throttle`.

---

## Error Response Format

All errors return a consistent envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "fields": [{ "field": "name", "message": "Required" }]
  }
}
```

`fields` is present only for validation errors.

### Common Error Codes

| Code                 | HTTP Status |
|----------------------|-------------|
| BAD_REQUEST          | 400         |
| UNAUTHORIZED         | 401         |
| FORBIDDEN            | 403         |
| NOT_FOUND            | 404         |
| CONFLICT             | 409         |
| VALIDATION_FAILED    | 422         |
| RATE_LIMIT_EXCEEDED  | 429         |
| INTERNAL_ERROR       | 500         |

This table is the **HTTP status → code fallback** used when an exception carries no
explicit code. It is **not a closed enum**: services throw domain-specific codes
that are passed through verbatim (e.g. `TAB_NOT_FOUND`, `OWNERSHIP_VIOLATION`,
`INVALID_STATUS_TRANSITION`, `INVALID_CURSOR`).

Validation/schema failures return **422 `VALIDATION_FAILED`** with a `fields` array.
**400 `BAD_REQUEST`** is reserved for malformed-but-not-schema input (invalid UUID via
`ParseUUIDPipe`, invalid pagination cursor → `INVALID_CURSOR`).

---

## Pagination

### Cursor-based (public and user endpoints)

Query params: `cursor` (opaque string), `limit` (default 20).

```json
{
  "data": [],
  "pageInfo": { "nextCursor": "string | null", "hasMore": true }
}
```

### Offset-based (admin endpoints)

Query params: `page` (1-indexed), `pageSize` (default 20, max 500 for admin).

```json
{
  "data": [],
  "pageInfo": { "page": 1, "pageSize": 20, "totalCount": 142, "totalPages": 8 }
}
```

---

## Public Endpoints (No Auth)

### Health

| Method | Path            | Description                                       |
|--------|-----------------|---------------------------------------------------|
| GET    | `/health`       | Liveness. Returns `{ status: "ok", timestamp, uptime }` |
| GET    | `/health/ready` | Readiness probe (checks dependencies)             |

> `GET /metrics` (Prometheus scrape) is served at the **root**, intentionally
> outside the `/api/v1` prefix.

### Genres

| Method | Path          | Description                                          |
|--------|---------------|------------------------------------------------------|
| GET    | `/genres/all` | All genres for select/dropdown. Returns `[{ id, name, slug }]` |
| GET    | `/genres`     | Paginated genre list. Query: `cursor`, `limit`       |

### Artists

| Method | Path             | Description                                               |
|--------|------------------|-----------------------------------------------------------|
| GET    | `/artists/all`   | All artists for select. Returns `[{ id, name, slug }]`    |
| GET    | `/artists`       | Paginated artist list. Query: `cursor`, `limit`, `search` |
| GET    | `/artists/:slug` | Artist detail with songs and published tab counts         |

### Songs

| Method | Path           | Description                                                                     |
|--------|----------------|---------------------------------------------------------------------------------|
| GET    | `/songs/all`   | All songs for select. Returns `[{ id, title }]`                                 |
| GET    | `/songs`       | Paginated song list. Query: `cursor`, `limit`, `artistId`, `genreId`, `search`  |
| GET    | `/songs/:slug` | Song detail with artist, genres, and published tabs                             |

### Tabs

| Method | Path              | Description                                       |
|--------|-------------------|---------------------------------------------------|
| GET    | `/tabs`           | Published tabs (see filter params below)          |
| GET    | `/tabs/:id`       | Tab detail. OptionalAuth: drafts visible to owner/admin only |
| GET    | `/tabs/:id/rating`| Aggregate rating: `{ average, count }`            |

**`GET /tabs` query parameters:**

| Param        | Type   | Description                                |
|--------------|--------|--------------------------------------------|
| `cursor`     | string | Pagination cursor                          |
| `limit`      | number | Page size (default 20)                     |
| `songId`     | string | Filter by song                             |
| `tabType`    | enum   | `CHORDS`, `TAB`, `MIXED`                   |
| `instrument` | enum   | `GUITAR`, `BASS`, `UKULELE`, `PIANO`       |
| `difficulty` | enum   | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`     |
| `genreId`    | string | Filter by genre                            |
| `artistId`   | string | Filter by artist                           |
| `sortBy`     | string | `createdAt` or `publishedAt`               |
| `order`      | string | `asc` or `desc`                            |

### Search

| Method | Path      | Description                                                      |
|--------|-----------|------------------------------------------------------------------|
| GET    | `/search` | Global search across artists, songs, and tabs. Throttled: 30 req/min |

**Query parameters:** `q` (required, search term), `limit`.

**Response:**
```json
{
  "artists": [],
  "songs": [],
  "tabs": []
}
```

---

## User Endpoints (Auth Required)

All endpoints in this section require a valid Bearer token in the `Authorization` header.

### Profile

| Method | Path  | Description                                             |
|--------|-------|---------------------------------------------------------|
| GET    | `/me` | Current user profile: `{ id, email, displayName, role, status }` |
| PATCH  | `/me` | Update profile. Body: `{ displayName?: string }`. Throttled |

### User Tabs

| Method | Path                   | Description                                                 |
|--------|------------------------|-------------------------------------------------------------|
| POST   | `/me/tabs`             | Create draft tab. Returns 201. Throttled                    |
| GET    | `/me/tabs`             | List user's tabs (all statuses). Query: `cursor`, `limit`   |
| PUT    | `/me/tabs/:id`         | Update tab (DRAFT or REJECTED status only)                  |
| POST   | `/me/tabs/:id/submit`  | Submit tab for review (DRAFT/REJECTED -> PENDING)           |
| DELETE | `/me/tabs/:id`         | Soft-delete tab. Returns 204                                |

**`POST /me/tabs` request body:**

| Field           | Type   | Required | Description               |
|-----------------|--------|----------|---------------------------|
| `songId`        | string | yes      | Associated song ID        |
| `content`       | string | yes      | ChordPro content          |
| `tabType`       | enum   | yes      | `CHORDS`, `TAB`, `MIXED`  |
| `instrument`    | enum   | yes      | `GUITAR`, `BASS`, `UKULELE`, `PIANO` |
| `difficulty`    | enum   | yes      | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `titleOverride` | string | no       | Custom title override      |

**`PUT /me/tabs/:id` request body:** Same content fields as POST (all optional).

### User Ratings

| Method | Path                  | Description                                            |
|--------|-----------------------|--------------------------------------------------------|
| POST   | `/tabs/:id/rate`      | Rate a published tab. Body: `{ rating: 1-5 }`. Upsert. Throttled |
| GET    | `/me/tabs/:id/rating` | Get the current user's rating for a specific tab       |

---

## Admin Endpoints (ADMIN Role Required)

All admin endpoints require AuthGuard + RolesGuard with the `ADMIN` role. Admin listing endpoints use offset-based pagination.

### Dashboard

| Method | Path               | Description                                                              |
|--------|--------------------|--------------------------------------------------------------------------|
| GET    | `/admin/dashboard` | Metrics: `{ totalUsers, publishedTabs, pendingTabs, newTabsThisWeek }`   |

### Tab Moderation

| Method | Path                        | Description                                               |
|--------|-----------------------------|-----------------------------------------------------------|
| GET    | `/admin/tabs`               | All tabs. Query: `page`, `pageSize`, `status`, `includeDeleted`. Rows include embedded `song` and `author` summaries |
| GET    | `/admin/tabs/:id`           | Admin tab detail. Returns soft-deleted tabs too, with embedded `song` and `author` |
| POST   | `/admin/tabs`               | Create tab as current admin author. Body: `{ songId, content, tabType, instrument, difficulty, titleOverride?, status?, moderationNotes? }` |
| PATCH  | `/admin/tabs/:id`           | Update tab fields and optionally set `status` directly. `songId` and author do not change here |
| DELETE | `/admin/tabs/:id`           | Soft-delete any tab, including published ones |
| POST   | `/admin/tabs/:id/publish`   | Publish pending tab (PENDING -> PUBLISHED)                |
| POST   | `/admin/tabs/:id/reject`    | Reject pending tab. Body: `{ notes: string }`             |

### User Management

| Method | Path                        | Description                                                |
|--------|-----------------------------|------------------------------------------------------------|
| GET    | `/admin/users`              | List users. Query: `page`, `pageSize`, `role`, `status`    |
| PATCH  | `/admin/users/:id/role`     | Change role. Body: `{ role: "USER" | "ADMIN" }`. Cannot self-change |
| PATCH  | `/admin/users/:id/status`   | Change status. Body: `{ status: "ACTIVE" | "BLOCKED" }`. Cannot self-change |

### Catalog Management -- Artists

| Method | Path                 | Description                                                 |
|--------|----------------------|-------------------------------------------------------------|
| POST   | `/admin/artists`     | Create artist. Body: `{ name, sortName? }`. Auto-generates slug. Returns 201 |
| GET    | `/admin/artists`     | List artists. Query: `page`, `pageSize`, `search`           |
| GET    | `/admin/artists/:id` | Artist detail                                               |
| PATCH  | `/admin/artists/:id` | Update artist. Body: `{ name?, sortName? }`                 |
| DELETE | `/admin/artists/:id` | Soft-delete. Fails if artist has active songs               |

### Catalog Management -- Genres

| Method | Path                | Description                                                  |
|--------|---------------------|--------------------------------------------------------------|
| POST   | `/admin/genres`     | Create genre. Body: `{ name }`. Returns 201                  |
| GET    | `/admin/genres`     | List genres. Query: `page`, `pageSize`                       |
| GET    | `/admin/genres/:id` | Genre detail                                                 |
| PATCH  | `/admin/genres/:id` | Update genre. Body: `{ name? }`                              |
| DELETE | `/admin/genres/:id` | Soft-delete. Fails if genre has song associations            |

### Catalog Management -- Songs

| Method | Path                | Description                                                  |
|--------|---------------------|--------------------------------------------------------------|
| POST   | `/admin/songs`      | Create song. Body: `{ artistId, title, subtitle?, releaseYear?, genreIds? }`. Returns 201 |
| GET    | `/admin/songs`      | List songs. Query: `page`, `pageSize`, `artistId`, `genreId`, `search` |
| GET    | `/admin/songs/:id`  | Song detail with artist and genres                           |
| PATCH  | `/admin/songs/:id`  | Update song. Body: `{ title?, subtitle?, releaseYear?, genreIds? }` |
| DELETE | `/admin/songs/:id`  | Soft-delete. Fails if song has published tabs                |

---

## Enums Reference

| Enum         | Values                                     |
|--------------|--------------------------------------------|
| TabType      | `CHORDS`, `TAB`, `MIXED`                   |
| Instrument   | `GUITAR`, `BASS`, `UKULELE`, `PIANO`       |
| Difficulty   | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`     |
| TabStatus    | `DRAFT`, `PENDING`, `PUBLISHED`, `REJECTED`|
| UserRole     | `USER`, `ADMIN`                            |
| UserStatus   | `ACTIVE`, `BLOCKED`                        |
