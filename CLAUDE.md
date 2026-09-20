# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

TabSpot backend — REST API for a tablature/chord platform. The product stores musical tabs as raw **ChordPro** strings (no JSON trees); the frontend (Next.js) parses them at render time. The product spec, MVP scope, and roadmap live in `docs/` and are the authoritative context for any feature work:

- `docs/tab-spot.prd.md` — full product definition (domain entities, tab_type/instrument/difficulty enums, user roles).
- `docs/backend-mvp.md` — Sprint 1 technical breakdown.
- `docs/INIT_BACKEND_PLAN.md` — staged boilerplate setup plan (most stages already applied).
- `docs/initial-idea.md` — tech stack decisions and roadmap across sprints.

**Current state:** the repo is early scaffolding (NestJS 11 boilerplate + `AppController/AppService` + empty `common/` and `modules/` directories with `.gitkeep`). Prisma, `@nestjs/config`, Supabase Auth integration, Docker Compose, and the Catalog/Tabs/Admin modules described in the docs are **not yet implemented** — when adding them, follow the conventions in the planning docs (e.g., soft delete via `deletedAt`, ChordPro stored in a `TEXT content` column, Supabase JWT validated via Guard).

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

```bash
pnpm install
pnpm run start:dev          # watch-mode dev server on :3000 (PORT env overrides)
pnpm run start:prod         # runs compiled dist/main

pnpm run build              # nest build → dist/
pnpm run lint               # eslint --fix over {src,apps,libs,test}/**/*.ts
pnpm run format             # prettier --write on src/ and test/

pnpm run test               # jest unit tests (*.spec.ts under src/)
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e           # uses test/jest-e2e.json (rootDir: ./test, *.e2e-spec.ts)
pnpm jest path/to/file.spec.ts   # run a single unit test file
```

Note: `docs/initial-idea.md` recommends Vitest, but the scaffolded toolchain is Jest. Don't swap runners without confirming with the user.

## Architecture

### Directory layout (intentional skeleton)

```
src/
├── common/         # decorators, filters, guards, interceptors — shared cross-cutting concerns
├── config/         # @nestjs/config setup + env validation (planned)
├── modules/        # feature modules (Catalog, Tabs, Auth, Admin) — Feature-Driven Development
├── app.module.ts
└── main.ts
```

New features belong under `src/modules/<feature>/` as self-contained NestJS modules; shared building blocks go under `src/common/`.

### TypeScript path aliases

Defined in `tsconfig.json` — use these instead of deep relative imports:

- `@src/*` → `src/*`
- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`

### Code quality rules (enforced, not advisory)

`eslint.config.mjs` treats these as **errors**, so code won't ship without them:

- `@typescript-eslint/explicit-function-return-type` + `explicit-module-boundary-types` — every function needs an explicit return type (even `bootstrap(): Promise<void>` in `main.ts`).
- `@typescript-eslint/no-explicit-any` — never use `any`.
- `@typescript-eslint/no-floating-promises` + `no-misused-promises` — always `await` or `void` a promise.
- `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` — prefix intentionally-unused params with `_` (e.g., `_req` in guards).
- `tsconfig.json` also enables `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `strictNullChecks`, `noImplicitAny` as a second safety net.

Prettier config (`.prettierrc`): single quotes, trailing commas, 100-col width, semicolons.

<!-- sdd-lite:start generated_at="2026-08-04T23:02:31Z" version="0.1" package_root="sdd-lite" -->
You are a development assistant with access to `sdd-lite`, a structured change workflow for bounded repo changes.

## When to use sdd-lite

Use the `sdd-lite` orchestrator (canonical contract at `sdd-lite/orchestrator/SDDL-ORCHESTRATOR.md`) when one of these is true:

- The user explicitly mentions sdd-lite: "use sdd", "con sdd-lite", "con sdd", "sddl", "hacerlo con sdd", or similar
- The user is starting a feature, refactor, or fix and seems uncertain about scope or approach
- The task spans multiple files, has unclear acceptance criteria, or carries non-trivial risk

Do NOT activate sdd-lite automatically for:

- Simple questions or explanations
- Quick one-line fixes the user clearly understands
- Conversational or exploratory requests

## When to suggest sdd-lite (without forcing it)

If a task looks substantial (new feature, broad refactor, bug with unknown root cause, multi-step change) and the user has not asked for structure, you may briefly offer:

> "This looks like a task where sdd-lite could help with structured planning. Want to use it, or should I proceed directly?"

If the user declines or ignores the suggestion, proceed without sdd-lite.

## When sdd-lite is active

Read and follow the canonical orchestration contract at `sdd-lite/orchestrator/SDDL-ORCHESTRATOR.md`.
That contract is the single source of truth for delegation rules, handoff envelopes, result processing, routing, approvals, and all operational behavior.

Use canonical skills under `sdd-lite/skills/`, runtime standards at `./sdd-lite/skill-catalog.md`, and schemas under `sdd-lite/schemas/`.

Rules:
- Run bootstrap preflight first. If bootstrap files are missing or unusable, stop and run `sddl-init`.
- Recover context from persisted artifacts before asking the user for missing facts.
- Persisted artifacts must remain in English. Chat interaction may be `es` or `en`.

## Platform: Claude Code

### Agent tool delegation

Delegation uses the native **Agent tool**. Each stage worker receives a fresh context via a dedicated Agent call. Pass the compact handoff envelope as the agent prompt. Do not use the Skill tool or Task tool for stage delegation.

`interactive` / `auto` controls pauses between stages only. It does not grant permission to bypass `stage_approval`, skip mandatory checkpoints, or omit approval gates for code-touching stages. These are always required regardless of execution mode.

### Parallelization

Parallelize only independent read-only tasks (e.g., `sddl-deep-explorer` alongside a non-writing stage) or workers with fully disjoint write scopes. Never parallelize workers that write to overlapping artifact paths.

### Review protocols

`sddl-code-review` lenses and `sddl-judgment-day` judges run as parallel read-only Agent workers per the Review Worker Envelope in `SDDL-ORCHESTRATOR.md`. Launch judgment-day judges in one parallel batch, wait for both results before merging, and never let one judge see the other's output. Review workers return `findings` only; the orchestrator writes `review-ledger.md`.

### Worker boundaries

Child workers launched via Agent tool must not launch additional sub-agents. If a worker discovers work beyond its assigned scope, it must return `partial` or `blocked` with a `next_action` — not a new Agent call.

### Fallback if Agent tool is unavailable

If Agent tool delegation is denied or unavailable (e.g., blocked by user permissions):

- State visibly that stages will run without fresh-context isolation.
- Persist `state.yaml` immediately after each stage completes before continuing.
- Apply all canonical result-processing, routing, and approval rules.
- When a mandatory delegation trigger fires, explain the degradation before continuing inline.
<!-- sdd-lite:end -->
