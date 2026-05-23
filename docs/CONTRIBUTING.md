# Contributing Guide

This document covers the conventions, tooling, and workflow expected from every contributor to TabSpot backend.

## Branching Model (GitFlow)

| Branch | Purpose | Branches from |
|--------|---------|---------------|
| `main` | Production-ready code | -- |
| `develop` | Integration branch | -- |
| `feature/*` | New features | `develop` |
| `release/*` | Release preparation | `develop` |
| `hotfix/*` | Production fixes | `main` |

- All day-to-day work happens in `feature/*` branches.
- `release/*` branches are created when `develop` is ready for a release; final fixes go here before merging to `main` and back to `develop`.
- `hotfix/*` branches are merged to both `main` and `develop`.

## Commit Messages

Conventional Commits enforced by **commitlint + Husky** hook.

**Format:** `type(scope): description`

**Allowed types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `style`

**Examples:**

```
feat(tabs): add rating aggregation endpoint
fix(auth): handle expired token edge case
chore(deps): upgrade prisma to 7.8
test(catalog): add artist slug uniqueness tests
```

**Rules:**

- Type is required.
- Scope is optional but recommended.
- Description in lowercase, no period at end.
- Body and footer are optional.

## Pull Request Process

1. Create a feature branch from `develop`.
2. Make changes, commit with conventional messages.
3. Push and open a PR against `develop`.
4. Ensure CI passes (lint, typecheck, tests, build).
5. Request review.
6. Squash-merge or rebase-merge.

**PR description should include:**

- Summary of changes (what and why).
- Testing performed.
- Breaking changes (if any).

## Code Standards

### TypeScript Strict Mode

All strict checks are enabled. No `any` types allowed anywhere in the codebase.

### Explicit Return Types

Every function must have an explicit return type annotation. This is enforced by ESLint (`@typescript-eslint/explicit-function-return-type` and `explicit-module-boundary-types`).

### Unused Variables

Prefix intentionally unused parameters with `_` (e.g., `_req`). Enforced by both ESLint and TypeScript compiler options.

### Promises

Always `await` or explicitly `void` a promise. No floating promises allowed. Enforced by `@typescript-eslint/no-floating-promises` and `no-misused-promises`.

---

## Naming Conventions

### Files

Use kebab-case for all files:

```
auth.guard.ts
tab-rating.service.ts
create-tab.use-case.ts
```

**Standard suffixes:**

`.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.guard.ts`, `.decorator.ts`, `.filter.ts`, `.dto.ts`, `.schema.ts`, `.spec.ts`, `.e2e-spec.ts`, `.use-case.ts`

### Symbols

| Convention | Usage |
|------------|-------|
| PascalCase | Classes, interfaces, types, enums, decorators |
| camelCase | Functions, methods, variables, properties |
| UPPER_SNAKE_CASE | Constants, injection tokens |

Prefix interfaces with `I` only for ports (e.g., `ITabRepository`).

---

## Import Order

Organize imports in the following groups, separated by a blank line between each:

1. Node built-ins (`node:*`)
2. External packages (`@nestjs/*`, `zod`, etc.)
3. Path aliases (`@common/*`, `@modules/*`, `@config/*`, `@src/*`)
4. Relative imports (`./`, `../`)

---

## Code Quality Tooling

| Tool | Config File | Command |
|------|-------------|---------|
| ESLint | `eslint.config.mjs` | `pnpm run lint` |
| Prettier | `.prettierrc` | `pnpm run format` |
| TypeScript | `tsconfig.json` | `pnpm run typecheck` |
| commitlint | `commitlint.config.js` | Auto (Husky hook) |

**Prettier settings:** single quotes, trailing commas, 100-char width, semicolons.

---

## Pre-Commit Hooks

Husky runs on every commit:

1. `pnpm run lint` -- ESLint with auto-fix.
2. `tsc --noEmit` -- Full type check.
3. `pnpm run test` -- Unit test suite.
4. commitlint -- Validates commit message format.

All must pass for the commit to succeed.

---

## Testing Requirements

- **Coverage gate:** 80% (lines, branches, functions, statements).
- Write tests for: business logic, guards, utils, use-cases, services.
- E2E tests for: critical API flows.
- See `docs-v2/TESTING.md` for the full testing guide.

---

## Code Review Checklist

- [ ] Changes match the PR description
- [ ] No `any` types introduced
- [ ] All functions have explicit return types
- [ ] No floating promises
- [ ] New endpoints have OpenAPI decorators
- [ ] DTOs use Zod schemas (not class-validator)
- [ ] Soft-delete respected where applicable
- [ ] No secrets or credentials in code
- [ ] Tests added for new/changed behavior
- [ ] No unnecessary comments (code should be self-documenting)

---

## What NOT to Do

- Don't use `class-validator` or `class-transformer` -- use Zod.
- Don't use `any` -- find the proper type.
- Don't skip pre-commit hooks with `--no-verify`.
- Don't commit `.env` files.
- Don't add comments explaining what the code does -- only why.
- Don't introduce abstractions for single-use patterns.
- Don't use relative imports when a path alias exists.
