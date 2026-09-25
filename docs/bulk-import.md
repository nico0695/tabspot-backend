# Bulk Import

Admin endpoint for importing multiple songs with their tabs in a single operation.

## What it does

Allows administrators to bulk import songs and tabs. The system:

1. **Resolves the artist** (creates, reuses, or restores if soft-deleted)
2. **Processes each song** independently and in isolation
3. **Handles versions** (tabs) with automatic versioning
4. **Avoids duplicates** by identical content
5. **Reports detailed results** (successes, skips, errors)

## Flow

```
┌─────────────────────────────────────────────────────────────┐
│              POST /admin/tabs/bulk-import                   │
│         Body: { artist, defaults, songs[] }                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  1. Resolve artist      │
              │  - Find by ID or slug   │
              │  - Create/Restore       │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  2. Validate genres     │
              │  (if present in song)   │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  3. For each song       │◄──────┐
              │     in songs[]          │       │
              └─────────────────────────┘       │
                            │                   │
                            ▼                   │
              ┌─────────────────────────┐       │
              │  3a. Resolve song       │       │
              │  - Find by slug         │       │
              │  - Create/Restore       │       │
              └─────────────────────────┘       │
                            │                   │
                            ▼                   │
              ┌─────────────────────────┐       │
              │  3b. Advisory Lock      │       │
              │  (serialize writes)     │       │
              └─────────────────────────┘       │
                            │                   │
                            ▼                   │
              ┌─────────────────────────┐       │
              │  3c. Calculate version  │       │
              │  MAX(versionNumber) + 1 │       │
              └─────────────────────────┘       │
                            │                   │
                            ▼                   │
              ┌─────────────────────────┐       │
              │  3d. For each version   │       │
              │     - Dedupe content    │       │
              │     - Create tab        │       │
              └─────────────────────────┘       │
                            │                   │
                            ▼                   │
              ┌─────────────────────────┐       │
              │  3e. Song result        │       │
              │  - created/reused       │       │
              │  - tabsInserted/Skipped │       │
              └─────────────────────────┘       │
                            │                   │
                            └───────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  4. Aggregate results   │
              │  - inserted/skipped     │
              │  - results[]/errors[]   │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  5. Return 200 OK       │
              │  (always, even with     │
              │   partial failures)     │
              └─────────────────────────┘
```

## Key Design Points

### 1. Failure Isolation
- If one song fails, others continue
- Errors are reported in `errors[]` with index and code
- Endpoint **always returns 200** (never 4xx/5xx for partial failures)

### 2. Content Deduplication
- If tab content already exists (byte-identical), it's skipped
- Prevents duplicates on re-imports
- No client-side `Idempotency-Key` required

### 3. Automatic Versioning
- `versionNumber` is calculated as `MAX(versionNumber) + 1` per song
- Includes soft-deleted tabs in the calculation
- Client **does not send** versionNumber

### 4. Soft-Delete Aware
- Soft-deleted artists/songs are **restored** if they match
- No duplicates are created
- Restore is transparent to the client

### 5. Advisory Lock
- `pg_advisory_xact_lock` per song to serialize writes
- Prevents race conditions on versionNumber
- Automatically released on commit/rollback

## Request/Response

### Request

```json
{
  "artist": { "id": "uuid" | "name": "Artist Name" },
  "defaults": {
    "status": "DRAFT|PUBLISHED",
    "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
    "instrument": "GUITAR|BASS|..."
  },
  "songs": [
    {
      "title": "Song Title",
      "genreIds": ["uuid1", "uuid2"],
      "versions": [
        {
          "content": "{title: Song}\n[C]Lyrics...",
          "tabType": "CHORDS|TAB|MIXED"
        }
      ]
    }
  ]
}
```

### Response (200 OK)

```json
{
  "inserted": { "artists": 1, "songs": 5, "tabs": 10 },
  "skipped": 2,
  "results": [
    {
      "title": "Song 1",
      "songStatus": "created",
      "songId": "uuid",
      "tabsInserted": 2,
      "tabsSkipped": 0
    }
  ],
  "errors": [
    {
      "index": 2,
      "title": "Song 3",
      "code": "INVALID_GENRE_IDS",
      "message": "One or more genre IDs are invalid"
    }
  ]
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| `ARTIST_NOT_FOUND` | Artist with explicit ID doesn't exist (422) |
| `INVALID_GENRE_IDS` | Invalid genre IDs in that song |
| `SONG_PERSIST_FAILED` | Unexpected error persisting song |

## Limits

- **100 songs** per request
- **20 versions** per song
- **100KB** content per version
- **15MB** total payload (configurable via `REQUEST_BODY_LIMIT`)

## Use Cases

✅ **Good for:**
- Importing complete artist catalog
- Mass tab migration
- Re-import with automatic dedupe
- Updating multiple songs in batch

❌ **Don't use for:**
- Async imports (it's synchronous)
- ZIP/multipart files (everything is JSON)
- Imports of >100 songs (split into batches)
