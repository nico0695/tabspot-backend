# TabSpot Backend — Contributing Guide

## About this document

This file is the **authoritative** reference for how to work on this codebase: how to set up
your environment, branch, commit, open pull requests, and run the test suites.

Its companion is [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md), which is authoritative for **what
to build** and how the codebase is organized. When this guide cites a rule that comes from
architecture, the architecture document is the source of truth.

Background docs (read for context, not authority):

- [`docs/tab-spot.prd.md`](./tab-spot.prd.md) — product definition.
- [`docs/backend-mvp.md`](./backend-mvp.md) — Sprint 1 technical breakdown.
- [`docs/initial-idea.md`](./initial-idea.md) — stack and roadmap.

For working with Claude Code on this repo, see [`CLAUDE.md`](../CLAUDE.md).

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ LTS | Match `package.json` `engines` if present; otherwise current LTS. |
| pnpm | latest stable | The **only** supported package manager. `pnpm-lock.yaml` is the source of truth. Do not use npm or yarn. |
| Docker | recent | For Postgres (dev + test) via Docker Compose. |
| Docker Compose v2 | recent | Invoked as `docker compose` (no hyphen). |
| Git | recent | GitFlow workflow; see §Branching. |

---

## Local setup

```bash
# 1. Clone
git clone <repo-url> tabspot-backend
cd tabspot-backend

# 2. Install dependencies
pnpm install

# 3. Bootstrap your env file (Sprint 1 follow-up: .env.example will be committed)
cp .env.example .env

# 4. Bring up Postgres (dev + test) — Sprint 1 follow-up: docker-compose.yml
pnpm db:up

# 5. Apply migrations — Sprint 1 follow-up: Prisma wiring
pnpm prisma migrate dev

# 6. Run the dev server (watch mode, port from PORT env, defaults to 3000)
pnpm run start:dev
```

> **Important.** `.env` is gitignored and **must never be committed**. The same applies to
> `.env.local` and any file containing real secrets.

> **Sprint 1 follow-ups.** Some of the commands above (`pnpm db:up`, `pnpm prisma migrate dev`,
> the existence of `.env.example`) depend on files being added in Sprint 1 work that has not
> yet landed. When a command is missing, that work is the blocker — do not improvise around it.

---

## Environment variables

- The **source of truth** for environment variables is `src/config/env.schema.ts` (a single
  Zod schema). At bootstrap, the schema runs `safeParse(process.env)` and the process exits
  with a clear error if anything is missing or malformed.
- `.env.example` is committed and **must stay in lockstep with `env.schema.ts`**. When you
  add or rename a variable in one, update the other in the **same PR**.
- Never commit `.env`, `.env.local`, or any file containing real secrets.

---

## Branching model — GitFlow

We use **GitFlow** with two long-lived branches and three short-lived branch types.

### Long-lived branches

- **`main`** — production. Tagged on every release. **No direct commits.** Merges arrive only
  from `release/*` and `hotfix/*`.
- **`develop`** — integration. Feature PRs target this branch by default.

### Short-lived branches

| Branch pattern | Branched from | Merged to | Purpose |
|---|---|---|---|
| `feature/<kebab-description>` | `develop` | `develop` (squash) | New work toward the next release. |
| `release/<x.y.z>` | `develop` | `main` (tag), then back-merge to `develop` | Stabilize a release. Only fixes against the release. |
| `hotfix/<kebab-description>` | `main` | `main` (tag), then back-merge to `develop` | Urgent production fix. |

### Diagram

```text
  main      ───●─────────────●─────────────●──────────●──   (tags: v0.1, v0.2, v0.2.1, v0.3)
                \           / \           / \         /
                 \         /   \         /   \       /
  release/0.2.0   \       ●───●          \   ●──────/
                   \     /                \         /
                    \   /                  \       /
  hotfix/fix-x       \ /                    ●─────/
                      \                      \
  develop  ─●─●─●─●────●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─
              \   \                       \      \
               \   \                       \      \
  feature/foo   ●───●                       \      \
  feature/bar                                ●──────●
```

### Naming examples

- `feature/add-tabs-module`
- `feature/auth-roles-guard`
- `release/0.2.0`
- `hotfix/fix-rating-overflow`

> **PR direction reminder.** Never PR `develop → main` directly. The only paths from `develop`
> to `main` are `release/*` and (for emergencies) `hotfix/*`.

---

## Commits — Conventional Commits

We use [**Conventional Commits**](https://www.conventionalcommits.org), strictly enforced by
**`husky`** + **`commitlint`** on the `commit-msg` hook. **Invalid commits are blocked.**

### Allowed types

`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `style`.

### Format

```text
<type>(<scope>?): <subject>

<body — optional, wrap at ~100 cols>

<footer — optional, BREAKING CHANGE / Closes #...>
```

- **Scope** is optional but **recommended** when scoping a module: `feat(tabs): ...`,
  `fix(auth): ...`.
- **Subject**: imperative, lowercase, no trailing period, ≤72 chars.
- **Body**: explain **WHY**, not WHAT. The diff already shows what changed.
- **Footer**: `BREAKING CHANGE: <description>` for breaking changes; `Closes #123` for issues.

### Examples

```text
feat(tabs): add publish use-case with status workflow

Introduces PublishTabUseCase to centralize the draft → pending → published transition.
The previous direct service mutation made it impossible to enforce the
"only owner can publish" rule consistently from admin endpoints.
```

```text
fix(auth): reject expired Supabase JWTs at the guard
```

```text
chore(deps): bump nestjs-zod to 3.0.4
```

> **Do not bypass the hook with `--no-verify`.** If commitlint blocks you, the message is
> wrong — fix the message.

---

## Pull requests

### Targets

- `feature/*` → **`develop`**.
- `release/*` and `hotfix/*` → **`main`** (and back-merge to `develop` after).

### Title and merge style

- The PR title follows the same Conventional Commits format as the squash commit it will
  produce.
- **Always squash-merge** `feature/*` into `develop`.
- Use a **regular merge** for `release/*` and `hotfix/*` into `main` so the merge commit
  anchors the version tag.

### PR description template

Copy this into every new PR:

```markdown
## What
<1–2 sentences describing the change>

## Why
<motivation; link issues if any>

## How to test
1. <step>
2. <step>
3. <expected result>

## Checklist
- [ ] Conventional Commits subject and body
- [ ] Branch name follows `feature/`, `release/`, or `hotfix/`
- [ ] Path aliases used (no deep relative imports)
- [ ] Repository pattern respected (no `PrismaService` injected into services)
- [ ] DTOs use Zod schemas (no `class-validator`); types via `z.infer`
- [ ] DTOs split per audience when shapes diverge
- [ ] Routes follow `/api/v1/...`, `/api/v1/me/...`, or `/api/v1/admin/...`
- [ ] Soft delete respected (no manual `deletedAt` filter; relies on the extension)
- [ ] Logging follows redaction rules (no tokens, passwords, full Authorization headers, full emails, ChordPro content, Supabase service keys)
- [ ] Tests live under `__tests__/` folders per layer
- [ ] Coverage gate (80%) still passes
- [ ] No `any`, no floating promises, no `class-validator` imports
```

### Required CI checks

CI must pass before merge (Sprint 4 follow-up to wire the pipeline; the expectation is set now):

- `pnpm run lint`
- `pnpm exec tsc --noEmit -p tsconfig.json`
- `pnpm run test` (unit + integration)
- `pnpm run test:e2e`
- `pnpm run build`
- Coverage gate: 80% global

### Approvals

- 1 approval required.
- **Solo self-merge** is acceptable as a **temporary exception** while there is only one
  developer on the project. **Remove this exception** the moment a second contributor joins.

---

## Code review checklist

Reviewers run through this list before approving. It is the same list copied into the PR
description above so authors self-review first.

- Conventional Commits subject and body.
- Branch naming follows `feature/`, `release/`, or `hotfix/`.
- Path aliases used (no deep relative imports).
- Repository pattern respected (no `PrismaService` in services).
- Zod schemas used for DTOs (no `class-validator`); types via `z.infer`.
- DTOs split per audience when shapes diverge.
- Routes follow `/api/v1/...`, `/api/v1/me/...`, `/api/v1/admin/...`.
- Soft delete respected (no manual `deletedAt` filter; uses the extension).
- Logging follows the redaction list (no tokens, passwords, full `Authorization` headers, full
  emails, ChordPro content, Supabase service keys).
- Tests added under `__tests__/` folders per layer.
- Coverage gate (80%) still passes; new branches and functions are covered.
- No `any`, no floating promises, no `class-validator` imports.

---

## Naming conventions

### Files (kebab-case with role suffix)

| Pattern | Example |
|---|---|
| `*.controller.ts` | `tabs-public.controller.ts` |
| `*.service.ts` | `tabs.service.ts` |
| `*.repository.ts` | `tab.repository.ts` |
| `*.use-case.ts` | `publish-tab.use-case.ts` |
| `*.module.ts` | `tabs.module.ts` |
| `*.guard.ts` | `auth.guard.ts` |
| `*.filter.ts` | `http-exception.filter.ts` |
| `*.interceptor.ts` | `logger.interceptor.ts` |
| `*.pipe.ts` | `parse-tab-id.pipe.ts` |
| `*.decorator.ts` | `current-user.decorator.ts` |
| `*.adapter.ts` | `supabase-identity.adapter.ts` |
| `*.port.ts` | `tab-repository.port.ts` |
| `*.schema.ts` | `create-tab.schema.ts` (raw Zod schema) |
| `*.dto.ts` | `create-tab.dto.ts` (`createZodDto` class) |
| `*.spec.ts` | `tab.repository.spec.ts` (unit / integration) |
| `*.e2e-spec.ts` | `tabs.e2e-spec.ts` (under `test/`) |

### Symbols

- **Classes**: PascalCase — `TabsController`, `CreateTabDto`, `PublishTabUseCase`.
- **Variables / functions**: camelCase.
- **Enums**: PascalCase for the enum, `UPPER_SNAKE_CASE` for members:
  `enum UserRole { USER, ADMIN }`.
- **Branded ID types**: PascalCase brand applied to a Zod string:
  `z.string().uuid().brand<'TabId'>()` → `TabId`, `ArtistId`, `UserId`.

---

## Imports order

Three groups, separated by **one blank line**, in this order:

1. **External packages** — `@nestjs/common`, `zod`, `nestjs-zod`, …
2. **Aliased imports** — `@modules/...`, `@common/...`, `@config/...`, `@src/...`.
3. **Relative imports** — `./create-tab.schema`, …

Alphabetize within each group when the editor cannot do it automatically.

```ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '@src/prisma/prisma.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

import { CreateTabSchema } from './create-tab.schema';
```

> **Deep relative imports (`../../...`) are forbidden.** Use the aliases.

---

## Comments policy

- **Default to writing no comments.** Well-named identifiers do the work.
- Add a comment **only** when the WHY is non-obvious: a hidden constraint, a subtle
  invariant, a workaround for a specific bug.
- **Do not** explain WHAT the code does — the names already do.
- **Do not** reference current tasks, fix numbers, or callers (`used by X`, `added for Y`).
  That belongs in the PR description and rots as the codebase evolves.
- **JSDoc** only on public exports of `common/` utilities or on shared schemas where API
  documentation has real value for consumers.

---

## Tests — running the suites

| Command | Purpose |
|---|---|
| `pnpm test` | Full unit + integration suite (Jest). |
| `pnpm test:watch` | Watch mode while developing. |
| `pnpm test:cov` | Runs the suite with coverage; CI uses this for the 80% gate. |
| `pnpm test:e2e` | End-to-end suite under `test/` (`*.e2e-spec.ts`). |
| `pnpm jest path/to/file.spec.ts` | Run a single test file. |

> **Layout migration note.** The test layout was intentionally changed from colocated
> `*.spec.ts` to `__tests__/` folders per layer (see next section). The Jest config update is
> a **Sprint 1 follow-up**; until that lands, the existing `src/app.controller.spec.ts`
> continues to work in place. Do not move it ahead of the config change.

---

## Tests — `__tests__/` layout

Tests live in `__tests__/` folders **inside each layer** of each module.

```text
src/modules/tabs/
├── repositories/
│   ├── prisma-tab.repository.ts
│   └── __tests__/
│       └── prisma-tab.repository.spec.ts
├── use-cases/
│   ├── publish-tab.use-case.ts
│   └── __tests__/
│       └── publish-tab.use-case.spec.ts
└── __tests__/
    └── tabs.service.spec.ts
```

End-to-end specs (`*.e2e-spec.ts`) live under the top-level `test/` directory.

**Reasoning.** Keeps tests near their subject (high cohesion) without polluting the production
source listing.

---

## Tests — types and what to mock

Three test types:

| Type | IO | DB | External adapters | Lives in |
|---|---|---|---|---|
| **Unit** | none | none | mocked | `__tests__/` per layer |
| **Integration** | local | real Postgres test DB | mocked | `__tests__/` per layer |
| **E2E** | full | real Postgres test DB | mocked | `test/*.e2e-spec.ts` |

Mocks policy:

- **Mock external adapters**: Supabase, future notifications, future email.
- **Do NOT mock Prisma** at the integration or e2e level — the whole point is to exercise the
  real query path against the test DB.
- **Do NOT mock first-party services** across modules. If you find yourself wanting to,
  refactor toward a port — that is the signal that the dependency is genuinely swappable.

---

## Tests — coverage gate

- CI enforces **80% global coverage** on lines, branches, functions, and statements
  (configured in `jest.config`).
- Local `pnpm test:cov` runs the same gate so failures surface **before** PR.
- Sensible exclude patterns (Sprint 1 follow-up to add to `jest.config`):

```text
src/main.ts                  # bootstrap glue
src/**/*.module.ts           # DI wiring
src/**/dto/*.dto.ts          # createZodDto shells (the schema underneath is what matters)
```

> When you write new code, you write its tests in the **same PR**. New uncovered code that
> drops coverage below 80% blocks the merge.

---

## Tests — fixtures and factories

- **Factory-per-entity** files live under `test/factories/` (e.g., `test/factories/make-tab.ts`).
- Each factory is a single function: `makeTab(overrides?: Partial<Tab>): Tab` — return a valid
  in-memory entity with sensible defaults; `overrides` lets tests tweak the fields they care
  about.
- Factories generate **plausible but deterministic** data. Use a seeded faker, or fixed UUIDs
  in tests that compare exact values.
- **Fixtures** (large blobs, sample ChordPro files) live under `test/fixtures/` and are loaded
  with `fs.readFileSync` in the test setup.

```ts
// test/factories/make-tab.ts
import type { Tab } from '@prisma/client';

export const makeTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Wonderwall',
  artistId: '00000000-0000-0000-0000-000000000010',
  content: '[C]Today is gonna be the day...',
  difficulty: 'MEDIUM',
  status: 'DRAFT',
  ownerId: '00000000-0000-0000-0000-000000000020',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});
```

---

## Quality tooling — local and CI

| Command | Purpose |
|---|---|
| `pnpm run lint` | `eslint --fix` over `{src,apps,libs,test}/**/*.ts`. |
| `pnpm run format` | `prettier --write` on `src/` and `test/`. |
| `pnpm exec tsc --noEmit -p tsconfig.json` | Strict typecheck without emit. |
| `pnpm run build` | `nest build` into `dist/`. |
| `pnpm test:cov` | Tests + 80% coverage gate. |
| `pnpm test:e2e` | End-to-end suite. |

**All of the above must pass before opening a PR.** CI runs them; local pre-push hooks
(Sprint 4 follow-up) will mirror this.

**Editor configuration:** enable "Format on save" with Prettier and "ESLint: Auto Fix on
Save" so the rules apply continuously.

---

## Code quality rules (full list)

The load-bearing rules duplicated here so contributors do not have to chase across files:

### ESLint errors that must stay green

- `@typescript-eslint/explicit-function-return-type`
- `@typescript-eslint/explicit-module-boundary-types`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` —
  always `await` or `void` a promise.
- `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` — prefix intentionally
  unused params with `_` (e.g., `_req` in guards).

### TypeScript strict flags (`tsconfig.json`)

- `strictNullChecks`
- `noImplicitAny`
- `noUnusedLocals`
- `noUnusedParameters`
- `noImplicitReturns`

### Prettier

- Single quotes
- Trailing commas
- 100-column width
- Semicolons

---

## What NOT to do (drift prevention)

- Do **not** introduce `class-validator` or `class-transformer`. We use Zod end-to-end via
  `nestjs-zod`.
- Do **not** inject `PrismaService` directly into a service. Go through a repository.
- Do **not** use Prisma legacy middleware (`prisma.$use(...)`). Use `$extends`.
- Do **not** define schemas inside request handlers. Schemas live at module scope.
- Do **not** use `z.any()` or `z.unknown()` outside an explicitly documented boundary.
- Do **not** deep-relative-import (`../../...`). Use `@modules/`, `@common/`, `@config/`,
  `@src/`.
- Do **not** skip Conventional Commits with `--no-verify`. Fix the message instead.
- Do **not** commit `.env` files or any real secret.
- Do **not** auto-mock Prisma in integration tests.
- Do **not** add custom `DomainError` classes. Throw native Nest `HttpException` subclasses
  (`NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`, …).

---

## Authority and maintenance

This document is authoritative for the developer workflow. When a rule here changes, update
the corresponding bullets in `sdd-lite/skill-catalog.md` under
`## Project Standards (auto-resolved)` so downstream tooling stays aligned.

Architecture rules belong in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md). Keep the two docs
in sync: when one references a rule, the other should not contradict it.
