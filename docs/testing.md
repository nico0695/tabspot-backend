# Testing

## Overview

TabSpot uses **Jest 30** with **ts-jest** as the test framework and transpiler.
ts-jest is chosen over SWC for tests to preserve full type-checking during test runs.

- **Coverage threshold:** 80% across lines, branches, functions, and statements.
- **Test database:** Separate PostgreSQL instance on port **5433** (`tabspot_test`).
- **Max workers:** 1 (sequential execution for database safety).

## Test Structure

```
src/
  modules/
    auth/__tests__/          # Auth guard, service, adapter specs
    tabs/__tests__/          # Tab use-case, service, rating specs
    ...
  common/
    guards/__tests__/        # Guard unit tests
    utils/__tests__/         # Cursor, slugify tests
    filters/__tests__/       # Exception filter tests
  config/__tests__/          # Env validation tests

test/
  e2e/                       # E2E test specs (*.e2e-spec.ts)
  support/
    e2e-env.ts               # E2E environment setup
  jest-e2e.json              # E2E Jest configuration
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run test` | Run all unit tests |
| `pnpm run test:watch` | Watch mode |
| `pnpm run test:cov` | Generate coverage report |
| `pnpm run test:e2e` | Run E2E tests |
| `pnpm jest path/to/file.spec.ts` | Run single test file |

## Unit Tests

- Co-located with source code in `__tests__/` directories.
- File pattern: `*.spec.ts`.
- External dependencies (Prisma, identity provider) are mocked.
- Focus areas: business logic, guards, utils, use-cases.

## E2E Tests

- Located in `test/e2e/`.
- File pattern: `*.e2e-spec.ts`.
- Uses **supertest** for HTTP assertions.
- Runs against a real test database (PostgreSQL on port 5433).
- Requires `pnpm run db:up` before running.
- Setup file `test/support/e2e-env.ts` configures `DATABASE_URL_TEST`.

## Coverage

Coverage gate is enforced at **80%** across all metrics (lines, branches, functions, statements).

Collected from:

```
src/**/*.ts
```

Excluded from coverage:

- `main.ts`
- `*.module.ts`
- `*.dto.ts`
- `src/generated/prisma/*`
- `src/config/*`
- `src/common/*`

## Configuration

| File | Purpose |
|------|---------|
| `jest.config.ts` | Unit test config with path alias mapping |
| `test/jest-e2e.json` | E2E config with Prisma module mapping |

Key settings:

- Max workers set to **1** for sequential execution (database safety).
- The `jose` module is **not** ignored by `transformIgnorePatterns` and is transformed by ts-jest.

## Path Aliases in Tests

Jest resolves the same path aliases defined in `tsconfig.json`:

```
@src/*      -> src/*
@modules/*  -> src/modules/*
@common/*   -> src/common/*
@config/*   -> src/config/*
```

These are mapped via `moduleNameMapper` in `jest.config.ts`.

## Pre-commit Hook

The full test suite runs as part of the pre-commit hook (via Husky):

```
lint -> typecheck -> test
```

Commits are blocked if any test fails.

## Conventions

- Name test files `*.spec.ts` for unit tests, `*.e2e-spec.ts` for E2E tests.
- Use `describe`/`it` blocks with clear, descriptive test names.
- Mock at the boundary (repository/adapter level), not internal services.
- Prefer explicit assertions over snapshot testing.
- Test state transitions exhaustively, covering both valid and invalid paths.
