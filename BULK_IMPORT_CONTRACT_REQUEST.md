# Request: Bulk Tab Import Endpoint

**Status:** accepted (implemented in Flow 2 of bulk-import plan)

**To:** Backend team
**From:** Frontend (TabSpot admin)
**Date:** 2026-08-04
**Status:** Proposal — needs your confirmation before we build against it

---

## What we need

One new **ADMIN-only** endpoint that accepts a batch of songs (each with one or more tab versions) as JSON
and persists them.

The admin bulk importer UI at `/admin/import` is built and working against a parser stub. The send step is
the last piece, and it is blocked on this endpoint. **Nothing else is blocking us.**

We are proposing a concrete contract below so you can accept, adjust, or reject it quickly. Everything here
has been aligned against your existing OpenAPI spec — namespace, error envelope, status codes and DTO shapes
follow the conventions already in `/api/v1/admin/*`.

---

## Context: what the frontend does before calling you

Admins import a folder of ChordPro files — realistically **thousands of files per import**. The structure is
one artist per import, songs as folders, versions as files:

```
{artist}/
  {song}/
    {song}.cho        # version 1
    {song}-2.cho      # version 2
    {song}.log        # optional metadata, never sent
```

All reading, parsing, metadata inference and validation happens **client-side in a Web Worker**. By the time
we call you:

- You receive **JSON only** — never a `.zip`, never a raw file upload, never multipart.
- `content` is the **verbatim** `.cho` text. We never modify the body, only metadata.
- Invalid or untitled tabs are already filtered out client-side. The admin reviews and edits every row
  before sending.
- We send **only the versions the admin marked as ready**.

We split the send into sequential batches (await batch N before sending N+1) with pause/retry, specifically
to avoid `413` and timeouts.

---

## Proposed endpoint

```
POST /api/v1/admin/tabs/bulk-import
```

**Auth:** `bearer` JWT, ADMIN role — same as every other `/api/v1/admin/*` operation.

> **Note:** an earlier internal draft of ours said `POST /api/v1/tabs/bulk-import`. That was wrong —
> `/api/v1/tabs/*` is your public, unauthenticated namespace. We corrected it to the admin namespace.
> If you prefer `/api/v1/admin/import` or another path, say so; we have no attachment to the name.

### Request body

One batch. Default batch size on our side is **50 songs**, configurable — see open question **Q2**.

```jsonc
{
  "artist": {
    "id": "uuid-or-omitted",     // present when the admin picked an existing artist
    "name": "Almafuerte",        // always present
    "sortName": "Almafuerte"     // optional
  },
  "defaults": {
    "status": "DRAFT",           // TabStatus
    "difficulty": "INTERMEDIATE",// Difficulty
    "instrument": "GUITAR"       // Instrument
  },
  "songs": [
    {
      "title": "Cosas que pasan",
      "subtitle": null,
      "releaseYear": null,
      "genreIds": [],
      "versions": [
        {
          "content": "{title: Cosas que pasan}\n{artist: Almafuerte}\n…verbatim .cho…",
          "tabType": "CHORDS",          // CHORDS | TAB | MIXED
          "instrument": "GUITAR",       // GUITAR | BASS | UKULELE | PIANO
          "difficulty": "INTERMEDIATE", // BEGINNER | INTERMEDIATE | ADVANCED
          "status": "DRAFT",            // DRAFT | PENDING | PUBLISHED | REJECTED
          "titleOverride": null,
          "versionNumber": 1            // see Q3 — happy to drop this
        }
      ]
    }
  ]
}
```

Enum values match `src/lib/api/enums.ts` on our side and the enums already in your spec — no new values.

We deliberately **do not send `slug`** for artist or song: neither `CreateArtistDto` nor `CreateSongDto`
accepts one today, so we assume you derive it. Confirm in **Q6**.

### Response `200`

```jsonc
{
  "inserted": { "artists": 0, "songs": 1, "tabs": 2 },
  "skipped": 0,
  "results": [
    {
      "title": "Cosas que pasan",
      "songStatus": "created",       // created | reused
      "songId": "uuid",
      "tabsInserted": 2
    }
  ],
  "errors": [
    { "title": "Broken song", "code": "SONG_PERSIST_FAILED", "message": "…" }
  ]
}
```

We need `results` **per song** so the UI can show the admin exactly what landed and what did not.

### Status codes

Following your existing `/api/v1/admin/tabs` conventions:

| Code | Meaning | What we do |
|---|---|---|
| `200` | Batch processed — including partial per-song failures reported in `errors[]` | Show per-song results; continue to next batch |
| `401` | Missing/invalid JWT | Surface session error, stop |
| `403` | Not ADMIN | Surface permission error, stop |
| `413` | Payload too large | Halve the batch size and retry automatically |
| `422` | Validation failed | Stop the run, show field errors |
| `500` | Server error | Pause, offer manual retry of that batch |

**Error envelope** — we parse exactly this shape (`src/lib/api/client.ts`), matching your `ErrorResponseDto`
and `ValidationErrorResponseDto`:

```jsonc
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": [ { "field": "…", "message": "…" } ] } }
```

> **Note:** our earlier draft proposed `400` with a flat `{ status, code, message, fields }`. Both were
> wrong — we've aligned to your `422` + nested `error` envelope.

---

## Behavior we need

1. **Per-song transaction.** Upsert artist → upsert song → create tab versions, atomically per song.
2. **Per-song failure isolation.** One malformed song must not roll back or abort the rest of the batch.
   Report it in `errors[]` and keep going. This is the single most important requirement: a 50-song batch
   failing wholesale because of one bad row makes the importer unusable at our volumes.
3. **Artist upsert once per request** — every song in a batch belongs to the same artist by construction.
4. **`content` stored verbatim.** No normalization, trimming, or re-encoding. Chord-over-lyric alignment is
   whitespace-significant; any reformatting corrupts the tab.

### Mapping to your existing models

| Our payload | Your model | Notes |
|---|---|---|
| `artist` | `AdminArtist` / `CreateArtistDto` | `name` required, `sortName` optional — matches |
| `songs[]` | `AdminSong` / `CreateSongDto` | needs `artistId` (resolved by you) + `title`; `subtitle`, `releaseYear`, `genreIds` optional — matches |
| `songs[].versions[]` | `AdminTab` / `CreateAdminTabDto` | needs `songId` (resolved by you) + `content`, `tabType`, `instrument`, `difficulty`; `titleOverride`, `status` optional — matches |

The bulk DTO is essentially your three existing create DTOs nested, with the FK fields resolved server-side.

---

## Open questions — we need your decision

These block us or change what we build. Ordered by impact.

**Q1 — Idempotency / retry safety.**
Our send loop retries a batch on network failure or `500`. If a request commits server-side but the response
never reaches us, a retry would duplicate an entire batch of songs. How do you want to handle this? Options
we see: an `Idempotency-Key` header we generate per batch; server-side dedupe on `(artistId, title)`; or you
accept the duplicate risk and we warn the admin. **We need one of these before we can ship retry.**

**Q2 — What is the real payload limit?**
Our 50-songs-per-batch default is a guess. A song with 5 versions of dense ChordPro is roughly 100–200 KB, so
50 songs can approach ~10 MB. Please give us a hard byte limit (body parser / proxy / nginx, whichever binds
first) and we will size batches to sit safely under it. Alternatively confirm `413` is returned cleanly and
we will auto-halve on it.

**Q3 — `versionNumber`: ours or yours?**
`versionNumber` appears on `AdminTabResponseDto` but not on `CreateAdminTabDto`, which suggests you assign it
server-side. We can send it (we know the intended order from filenames: `song.cho`, `song-2.cho`) or drop it
and let you sequence. **We prefer you assign it** — fewer ways for us to be wrong. Confirm which.

**Q4 — `authorUserId` on imported tabs.**
It is required on `AdminTabResponseDto`. Who owns a bulk-imported tab — the admin performing the import
(from the JWT), or a system/service user? We do not send it; we assume you derive it from the token.

**Q5 — Song dedupe semantics.**
When the same song title already exists for that artist, do you reuse it and append versions, or create a
second song? We expect **reuse** (`songStatus: "reused"`). Also: is matching case- and accent-insensitive?
`"Cosas Que Pasan"` vs `"cosas que pasan"` will happen in real folder data.

**Q6 — Slug derivation.**
We assume you derive artist and song slugs server-side, since neither create DTO accepts one. Confirm — and
tell us what happens on slug collision for distinct titles.

---

## What we need back

1. **Accept / adjust / reject** the endpoint shape above.
2. **Answers to Q1–Q6.** Q1 and Q2 are the blocking ones.
3. A rough **availability estimate**, so we can sequence our work.

If the shape is broadly right, we can start building the send layer against a mock immediately and swap to
the real endpoint when it lands — we just need the contract frozen, not the implementation finished.

---

## Reference

Full design context, including the client-side parsing pipeline and the staged rollout, lives in
`mass-import-blueprint-plan.md` §9 in the frontend repo. This document supersedes that section wherever they
disagree — §9 predates our alignment against your OpenAPI spec.
