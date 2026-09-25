# Response: Bulk Tab Import Endpoint

**Status:** accepted (implemented in Flow 2 of bulk-import plan)

**To:** Frontend team (TabSpot admin)
**From:** Backend
**Date:** 2026-08-05
**In reply to:** `BULK_IMPORT_CONTRACT_REQUEST.md` (2026-08-04)
**Status:** Contract accepted and frozen — build against it now

---

## 1. Verdict: accepted, with two deltas

`POST /api/v1/admin/tabs/bulk-import` is **accepted as proposed** — path, auth (`bearer` JWT,
`ADMIN` role), request/response shape, status codes, and error envelope — with exactly **two
contract deltas**:

1. **Request:** drop `versions[].versionNumber`. The backend assigns it (see Q3).
2. **Response:** each `results[]` entry gains `tabsSkipped` (see the deltas section below).

Everything else in your proposal stands as written. The contract is frozen as of this document;
any future deviation will be communicated explicitly, not slipped in.

---

## 2. Answers to Q1–Q6

**Q1 — Idempotency / retry safety: content dedupe.**
Before creating a version, if the target song already has a tab with **byte-identical `content`**,
we skip it and report it as skipped. No `Idempotency-Key` header, no dedupe table. This makes
retries of a committed batch safe: if a request commits server-side but the response never reaches
you, resending the same batch re-matches every already-persisted version by content and skips it.
You can ship your retry loop against this guarantee.

**Q2 — Payload limit: 15 MB, clean `413`, auto-halve confirmed viable.**
The body-parser limit (the binding limit) is raised to a default of **`15mb`**, env-configurable
via `REQUEST_BODY_LIMIT`. Your 50-song (~10 MB) default batch size fits with headroom. `413` is
returned cleanly with our standard error envelope (details and exact body in section 5), so your
**auto-halve-on-413 strategy is confirmed viable** — you can code against the stable error code
`PAYLOAD_TOO_LARGE` rather than sniffing status text.

**Q3 — `versionNumber`: we assign it.**
As you preferred. The backend sequences `versionNumber = max + 1` per song, inside the song's
transaction. Do not send it — it is removed from the request contract (delta 1).

**Q4 — `authorUserId`: derived from the admin JWT.**
The admin performing the import owns the tabs, same as the existing single-tab admin create path.
You send nothing.

**Q5 — Song dedupe semantics: reuse.**
When a song with a matching title already exists for the artist, we reuse it and append versions
(`songStatus: "reused"`). Matching is by `slugify(title)` against the song's unique
`(artistId, slug)` constraint, which is already **case- and accent-insensitive** (NFD accent strip
+ lowercase), so `"Cosas Que Pasan"` vs `"cosas que pasan"` resolve to the same song.
**Soft-deleted songs that match by slug are restored** (`deletedAt` cleared) and reused rather
than duplicated.

**Q6 — Slug derivation: server-side.**
Confirmed — slugs for both artist and song are derived server-side via our existing `slugify()`;
you never send one. **Slug-collision caveat you should surface to admins:** distinct titles that
collapse to the same slug (e.g. `"Song!"` vs `"Song"`) are treated as the **same song** and
reused — the second title's versions append to the first song rather than creating a new one.

---

## 3. Contract deltas (the only changes vs your proposal)

### Delta 1 — Request: `versions[].versionNumber` removed

Per Q3, do not send `versionNumber`. The rest of the request body
(`{ artist, defaults, songs[] }`, enums, optionality) is accepted exactly as proposed.

### Delta 2 — Response: `results[].tabsSkipped` added

Per-song results gain a `tabsSkipped` count (versions skipped by content dedupe, per Q1), so the
top-level `skipped` total is explainable per row in your UI:

```jsonc
{
  "inserted": { "artists": 0, "songs": 1, "tabs": 2 },
  "skipped": 1,
  "results": [
    {
      "title": "Cosas que pasan",
      "songStatus": "reused",   // created | reused
      "songId": "uuid",
      "tabsInserted": 2,
      "tabsSkipped": 1          // NEW — versions skipped by content dedupe
    }
  ],
  "errors": []
}
```

---

## 4. Additional decisions (not in your doc, decided during validation)

- **Artist upsert — once per request.** If `artist.id` is present, we validate it exists; a
  non-existent id fails the **whole batch** with `422` and error code **`ARTIST_NOT_FOUND`**
  (every song depends on the artist, so there is nothing partial to salvage). If `artist.id` is
  absent, we find the artist by `slugify(name)` (restoring a soft-deleted match) or create it.
- **Batch-level vs per-song failures.** Batch-level failures (invalid artist, malformed body)
  return `422` with the error envelope and persist nothing new. Per-song failures are reported in
  `errors[]` while the batch still returns `200` — your per-song failure-isolation requirement is
  guaranteed: one bad song never rolls back or aborts the rest of the batch (per-song
  transactions, as you asked).
- **`content` stored verbatim.** No normalization, trimming, or re-encoding — whitespace-significant
  chord alignment is preserved byte-for-byte.
- **Rate limiting — no change needed.** The global throttle is 100 requests / 60 s; a large import
  of ~40–60 sequential batches fits comfortably. Your await-batch-N-before-N+1 send loop needs no
  adjustment.

---

## 5. `413` behavior you can code against (already live on `dev`)

This is **probe-confirmed runtime behavior**, not a promise — the limit raise and the 413 envelope
are already implemented and verified on the `dev` branch:

- **Limit:** `15mb` by default (body parser; the binding limit), overridable per environment via
  the `REQUEST_BODY_LIMIT` env var.
- **Exact response on an oversized body:**

  ```
  HTTP/1.1 413 Payload Too Large
  Content-Type: application/json; charset=utf-8

  {"error":{"code":"PAYLOAD_TOO_LARGE","message":"request entity too large"}}
  ```

Key it on `error.code === "PAYLOAD_TOO_LARGE"` — the code is stable and part of this contract;
the `message` text is not guaranteed stable. Your auto-halve-and-retry handler can rely on this
shape today.

---

## 6. Availability

- **The contract is frozen now.** Start building the send layer against a mock immediately —
  nothing above will change without an explicit heads-up to you.
- The endpoint itself lands in a **follow-up backend flow** (the platform prep — body limit and
  413 envelope — is already live on `dev`, as noted above). We are not committing calendar dates
  in this document; you will be notified when the endpoint is available so you can swap the mock
  for the real thing.
