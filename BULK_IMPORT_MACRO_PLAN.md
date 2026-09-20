# Bulk Tab Import — Backend Macro Plan

**Status:** Approved decisions, pending implementation
**Date:** 2026-08-04
**Source contract:** `BULK_IMPORT_CONTRACT_REQUEST.md` (frontend proposal)
**Validated against:** current `dev` branch code (admin module, tabs service, prisma schema, env config)

---

## 1. Objective

Implement `POST /api/v1/admin/tabs/bulk-import`: an ADMIN-only endpoint that accepts a batch of
songs (each with one or more tab versions) for a single artist, and persists them with per-song
transactional isolation. Unblocks the frontend admin import wizard send step.

---

## 2. Locked decisions

These resolve the frontend's open questions Q1–Q6. They are final unless re-negotiated.

| # | Question | Decision |
|---|---|---|
| Q1 | Idempotency / retry safety | **Content dedupe.** Before creating a version, if the target song already has a tab with byte-identical `content`, skip it and report it as skipped. No `Idempotency-Key` header, no dedupe table. Retries of a committed batch are safe. |
| Q2 | Payload limit | **Raise `REQUEST_BODY_LIMIT` default to `15mb`** (env-configurable, currently `256kb`). Frontend's 50-song (~10 MB) batches fit. `413` must return the standard error envelope (verify — body-parser errors fire before the Zod pipe). |
| Q3 | `versionNumber` | **Backend assigns.** Note: today `prisma-tab.repository.ts` hardcodes `versionNumber: 1`; sequencing (`max + 1` per song, inside the song transaction) is new logic built for this feature. |
| Q4 | `authorUserId` | **Derived from the admin JWT**, same as the existing `createAdminTab` path. Frontend sends nothing. |
| Q5 | Song dedupe semantics | **Reuse** (`songStatus: "reused"`). Matching is by `slugify(title)` against `@@unique([artistId, slug])` — already case- and accent-insensitive (NFD strip + lowercase). **Soft-deleted songs matching by slug are restored** (`deletedAt = null`) and reused. |
| Q6 | Slug derivation | **Server-side** via existing `slugify()` for both artist and song. Distinct titles that collapse to the same slug (e.g. `"Song!"` vs `"Song"`) are treated as the same song and reused — communicate this to the frontend. |

### Additional decisions (found during validation, not in the frontend doc)

- **Artist upsert:** `artist.id` present → validate it exists (422 `ARTIST_NOT_FOUND` if not, aborts
  the whole batch since every song depends on it). `artist.id` absent → find by `slugify(name)`
  (restore if soft-deleted) or create. Once per request.
- **Response shape delta:** per-song results gain `tabsSkipped` (count of versions skipped by
  content dedupe) so the top-level `skipped` is explainable per row. Inform the frontend.
- **Batch-level failures** (invalid artist, malformed body) → `422` with error envelope.
  Per-song failures → reported in `errors[]` with the batch still returning `200`.
- **Rate limiting:** global throttle is 100 req/60s; a large import (~40–60 sequential batches)
  fits. No change needed.

---

## 3. Contract summary (as accepted)

- **Endpoint:** `POST /api/v1/admin/tabs/bulk-import` — Bearer JWT, `ADMIN` role.
- **Request:** `{ artist, defaults, songs[] }` as proposed in `BULK_IMPORT_CONTRACT_REQUEST.md`,
  minus `versions[].versionNumber` (dropped per Q3).
- **Response `200`:** `{ inserted: { artists, songs, tabs }, skipped, results[], errors[] }` with
  `results[].tabsSkipped` added.
- **Status codes:** `200` (incl. partial failures), `401`, `403`, `413`, `422`, `500` — as proposed.
- **Behavioral guarantees:** per-song transaction, per-song failure isolation, artist upsert once,
  `content` stored verbatim (no normalization of any kind).

---

## 4. Flow breakdown

Three sdd-lite flows. Each is an independently reviewable, controlled change. Flow 1 is small but
separated on purpose: it freezes the contract and unblocks the frontend immediately, before the
core implementation lands.

### Flow 1 — `bulk-import-contract-prep`

Freeze the contract and prepare the platform.

- Write `BULK_IMPORT_CONTRACT_RESPONSE.md` (answers to Q1–Q6 + contract deltas) for the frontend team.
- Raise `REQUEST_BODY_LIMIT` default `256kb → 15mb` (`env.schema.ts`, `.env.example`).
- Verify `413` from the body parser is emitted with the `{ error: { code, message } }` envelope;
  fix `HttpExceptionFilter` coverage if it is not.

**Touches:** `src/config/env.schema.ts`, `.env.example`, `src/common/filters/`, docs.
**Risk:** low. **Depends on:** nothing.

### Flow 2 — `bulk-import-endpoint`

The core feature.

- New admin subfeature `src/modules/admin/import/` (controller, service, DTOs) following the
  admin module architecture and API contract standards (Zod schemas → `createZodDto`, Swagger
  annotations, error envelope).
- `BulkImportService` orchestration:
  1. Resolve/upsert artist (once per request; restore soft-deleted).
  2. Per song, inside `prisma.$transaction`: find-or-create song by `(artistId, slug)` (restore
     soft-deleted), sequence `versionNumber = max + 1`, content-dedupe versions, create tabs with
     `authorUserId` from JWT and status metadata via the existing `normalizeAdminStatus` path.
  3. Catch per-song errors → `errors[]`, never abort the batch.
- Response DTO with `inserted` / `skipped` / `results[]` / `errors[]`.
- Unit tests: service (upsert paths, restore paths, dedupe, sequencing, isolation) + controller.

**Touches:** `src/modules/admin/import/**` (new), `admin.module.ts`, possibly small additions to
`SongRepository` / tab repository (find-by-slug-including-deleted, max version query).
**Risk:** medium (transactions, dedupe correctness). **Depends on:** Flow 1 (contract frozen).

### Flow 3 — `bulk-import-e2e-docs`

Hardening and documentation.

- e2e suite: happy path, reuse path, restore path, dedupe/retry replay, per-song failure isolation,
  413 behavior, auth/role guards.
- Regenerate `openapi.json`; update `docs/api-references.md`.
- Close out the contract docs (mark `BULK_IMPORT_CONTRACT_REQUEST.md` as accepted/superseded).

**Touches:** `test/**`, `openapi.json`, `docs/`.
**Risk:** low. **Depends on:** Flow 2.

---

## 5. Tracker

This section is the **macro view across the three sdd-lite flows**. Per-change `state.yaml` under
`./sdd-lite/openspec/changes/<change_name>/` remains the canonical sdd-lite state; this tracker is
the cross-flow rollup and must be updated at every flow checkpoint (see 5.5).

### 5.1 Status board

| Flow | sdd-lite change name | Status | Current stage | Started | Completed | Branch / PR |
|---|---|---|---|---|---|---|
| 1 | `bulk-import-contract-prep` | ☑ done | final QA pass_with_warnings | 2026-08-05 | 2026-08-05 | `feat/bulk-import` @ `de33813` |
| 2 | `bulk-import-endpoint` | ☑ done | final QA pass_with_warnings | 2026-08-05 | 2026-08-09 | `feat/bulk-import` (uncommitted) |
| 3 | `bulk-import-e2e-docs` | ☑ done | final QA pass | 2026-08-20 | 2026-08-20 | `feat/bulk-import` (uncommitted) |

Status values: `☐ not started` → `◐ in progress` → `⏸ blocked` → `☑ done` → `🗄 archived`.

### 5.2 Lifecycle checklist per flow

Check items as each sdd-lite stage is approved. Stages marked *(if routed)* may be skipped by the
orchestrator's routing for small flows — strike them through instead of checking if skipped.

**Flow 1 — `bulk-import-contract-prep`**

- [x] proposal approved
- [x] spec approved *(routed; validated in 3 staged parts)*
- [x] plan approved *(3 stages: S1 limit, S2 413 fix, S3 contract doc)*
- [x] execution complete (all stages) *(S1 15mb; S2 413 fix, 4R + stage QA pass_with_warnings; S3 doc, AC1.1–1.3 met)*
- [x] final QA verdict: **pass_with_warnings** *(340/340 tests, lint/tsc/build clean; sole warning = accepted r2 residual risk)*
- [x] `BULK_IMPORT_CONTRACT_RESPONSE.md` delivered to frontend team *(kept untracked by choice — workstream docs live outside VCS; shared with the frontend directly)*
- [ ] archived

**Flow 2 — `bulk-import-endpoint`**

- [x] proposal approved
- [x] spec approved *(validated in 3 staged parts; 20 ACs)*
- [x] design approved *(D1 advisory lock + D2 keep global 15mb user-validated; D3–D5 evidence-forced)*
- [x] plan approved *(3 stages: S1 foundations, S2 contract surface, S3 service core; amended with S4 fix stage from the 4R ledger)*
- [x] execution complete (all stages) *(S1–S4; full-4r review closed at round 1 — CRITICAL R4-001 verified fixed)*
- [x] final QA verdict: **pass_with_warnings** *(398/398 tests, lint/tsc/build clean; warnings = dispositioned follow-ups)*
- [ ] archived

**Flow 3 — `bulk-import-e2e-docs`**

- [x] proposal approved
- [x] spec approved *(reduced scope: 4 e2e tests + 1 auth assertion + openapi + docs)*
- ~~design~~ *(skipped — low risk, no endpoint code changes)*
- [x] plan approved *(2 stages: S1 e2e suite, S2 openapi + docs)*
- [x] execution complete (all stages) *(S1: 4/4 e2e + 1/1 swagger; S2: openapi regenerated, docs updated, contract docs marked accepted; $queryRaw→$executeRaw fix for advisory lock)*
- [x] final QA verdict: **pass** *(398/398 unit tests, 7/7 e2e, lint/tsc/build clean; r5 closed)*
- [x] `openapi.json` shared with frontend team
- [ ] archived

### 5.3 Cross-flow handoffs

What each flow must leave behind for the next one. The closing flow fills in the "Handoff notes"
line at final QA — this is the only context transfer between flows besides the artifacts themselves.

| From → To | Required deliverable | Delivered | Handoff notes |
|---|---|---|---|
| Flow 1 → Flow 2 | Contract frozen (`BULK_IMPORT_CONTRACT_RESPONSE.md`), body limit at 15mb, 413 envelope verified | ☑ | Carry-forward for Flow 2 design: review finding R1-001 — 15mb is platform-wide and body parsing precedes throttler/auth guards; consider a route-scoped parser (big limit only on the admin bulk-import route, small global default). 413 behavior is probe-confirmed: `{"error":{"code":"PAYLOAD_TOO_LARGE","message":"request entity too large"}}`. |
| Flow 1 → Frontend | Contract response doc → they build the send layer against a mock | ☑ | Doc kept untracked by choice (workstream docs outside VCS); shared with the frontend directly. Frozen 413/limit behavior shipped in `de33813`; endpoint code lands with the Flow 2 commit. |
| Flow 2 → Flow 3 | Endpoint merged to `dev`, unit tests green, any contract deviations documented | ☑ | Code complete and QA'd on `feat/bulk-import`. Zero contract deviations. Flow 3 e2e proved: advisory-lock SQL (r5 closed after $executeRaw fix), replay idempotency end-to-end. Follow-ups carried forward: r2 route-scoped parser, r4 versionNumber backfill. |
| Flow 3 → Frontend | Endpoint live + regenerated `openapi.json` → they swap mock for real | ☑ | `openapi.json` regenerated with bulk-import endpoint. Contract docs marked accepted. Frontend can now swap mock for real endpoint. |

### 5.4 Decision & deviation log

Anything decided or changed **during** a flow that affects the locked decisions (section 2), the
contract (section 3), or another flow. Empty means no deviations.

| Date | Flow | Decision / deviation | Impact |
|---|---|---|---|
| 2026-08-05 | 2 | D1: versionNumber concurrency handled with a per-song `pg_advisory_xact_lock` instead of a unique `(songId, versionNumber)` index — existing tabs all carry `versionNumber=1` (single-create hardcode), so the index would P2002 immediately. | Follow-up: backfill version numbers, then add the unique index. Single-create path keeps the hardcode for now. |
| 2026-08-05 | 2 | D2: R1-001 (15mb global parse surface before throttler/auth) intentionally left open — route-scoped parser only helps if the global default is lowered. | Deferred infra follow-up after Flow 3 e2e; revisit lowering the global default + scoping the big limit to the bulk route. |

### 5.5 Update protocol

- **On flow start:** set status `◐`, fill `Started`, record branch name.
- **On each stage approval:** tick the lifecycle checklist item; update `Current stage` in 5.1.
- **On any mid-flow decision that touches sections 2–3:** add a row to 5.4 before continuing.
- **On final QA:** record the verdict in 5.2, fill the handoff row(s) in 5.3.
- **On archive:** set status `🗄`, fill `Completed`.
- The sdd-lite executor/QA workers do not edit this file — the orchestrator (or you) updates it at
  checkpoints, keeping it consistent with each change's `state.yaml`.

---

## 6. Out of scope

- Zip/multipart upload, server-side file parsing (all parsing is client-side by design).
- Async job queue / progress polling — batches are synchronous request/response.
- `Idempotency-Key` infrastructure (superseded by content dedupe; revisit only if dedupe proves
  insufficient in practice).
- Genre auto-creation — `genreIds` must reference existing genres (422 `INVALID_GENRE_IDS` per song).
- Any change to the public `/api/v1/tabs/*` namespace.
