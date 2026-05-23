# Configuration

## Overview

All configuration is managed through environment variables, validated at startup with Zod schemas. The app fails fast if required variables are missing or invalid.

Configuration is loaded via `@nestjs/config` and registered under the `'app'` namespace. Access in services:

```typescript
configService.get('app.PORT');
```

## Environment Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | `development` \| `test` \| `production` | No | `development` | Determines logging level, CORS behavior, error detail |
| `PORT` | number | No | `3000` | Server listen port |
| `DATABASE_URL` | string | Yes | -- | PostgreSQL connection URL |
| `DATABASE_URL_TEST` | string | When `NODE_ENV=test` | -- | Test database connection URL |
| `SUPABASE_URL` | URL | Yes | -- | Supabase project URL for JWT verification |
| `SUPABASE_JWT_PUBLIC_KEY` | string | Yes | -- | JWT signing key (PEM, base64, or JWKS) |
| `CORS_ORIGINS` | CSV | Prod: required | `http://localhost:3001,http://127.0.0.1:3001` | Comma-separated allowed origins |
| `CORS_CREDENTIALS` | boolean | No | `false` | Allow credentials in CORS |
| `REQUEST_BODY_LIMIT` | string | No | `256kb` | Max request body size (format: `\d+(kb\|mb)`) |
| `THROTTLE_TTL` | number | No | `60` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | number | No | `100` | Max requests per window |
| `ENABLE_DOCS` | boolean | No | `false` | Enable Swagger UI at `/api/docs` |

## Production Validation Rules

When `NODE_ENV=production`:

- `CORS_ORIGINS` is required and must not contain `*`.
- Error responses hide internal details.
- Logging uses JSON format at `info` level.

When `NODE_ENV=test`:

- `DATABASE_URL_TEST` is required.

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.example` | Template with all variables and documentation | Yes |
| `.env` | Local development values | No (gitignored) |

## Validation Schema

Located at `src/config/env.schema.ts`. Uses Zod with `superRefine` for cross-field validation. The schema is parsed at app startup -- invalid config crashes immediately with a descriptive error.

## Config Module

| File | Role |
|------|------|
| `src/config/config.module.ts` | Global ConfigModule wrapper with Zod validation |
| `src/config/app.config.ts` | Registers config under `'app'` namespace |
| `src/config/env.schema.ts` | Zod schema + validation + types |
| `src/config/cors.config.ts` | Builds CORS options from env vars |

Type-safe access:

```typescript
constructor(private config: ConfigService<{ app: Env }>) {
  const port = this.config.get('app.PORT', { infer: true });
}
```

## CORS Configuration

- Allowed methods: `GET`, `HEAD`, `PUT`, `PATCH`, `POST`, `DELETE`, `OPTIONS`
- Allowed headers: `Authorization`, `Content-Type`
- Origin validation: whitelist-based check against `CORS_ORIGINS` array
- Development default: `http://localhost:3001`, `http://127.0.0.1:3001`
- Production: explicit HTTPS origins required

## Rate Limiting

Global throttler configured via `@nestjs/throttler`:

| Tier | Requests | Window | Applied to |
|------|----------|--------|------------|
| Global | 100 | 60s | All routes (default) |
| Write | 20 | 60s | Tab creation, profile update, rating |
| Search | 30 | 60s | Search endpoint |

Override per-route with `@Throttle()` decorator. Skip with `@SkipThrottle()`.

## Logging

| Environment | Level | Format | Transport |
|-------------|-------|--------|-----------|
| development | debug | Pretty-printed, colorized | pino-pretty |
| production | info | JSON (structured) | stdout |

Redacted fields (PII protection):

- `req.headers.authorization`
- `req.headers["x-supabase-service-key"]`
- `req.body.password`, `req.body.token`, `req.body.email`, `req.body.content`
- `res.body.*.password`, `res.body.*.token`

## TypeScript Configuration

| Setting | Value | File |
|---------|-------|------|
| Target | ES2023 | `tsconfig.json` |
| Module | nodenext | `tsconfig.json` |
| Strict mode | All checks enabled | `tsconfig.json` |
| Decorators | Enabled (legacy + metadata) | `tsconfig.json` |
| Incremental | true | `tsconfig.json` |

## Path Aliases

| Alias | Maps to | Configured in |
|-------|---------|---------------|
| `@src/*` | `src/*` | tsconfig.json, .swcrc, jest.config.ts |
| `@modules/*` | `src/modules/*` | tsconfig.json, .swcrc, jest.config.ts |
| `@common/*` | `src/common/*` | tsconfig.json, .swcrc, jest.config.ts |
| `@config/*` | `src/config/*` | tsconfig.json, .swcrc, jest.config.ts |

## ESLint Rules (Errors)

| Rule | Effect |
|------|--------|
| `explicit-function-return-type` | All functions need return type |
| `explicit-module-boundary-types` | Module exports need explicit types |
| `no-explicit-any` | No `any` type allowed |
| `no-floating-promises` | Must await or void promises |
| `no-misused-promises` | No promises in non-async contexts |
| `no-unused-vars` | Unused vars error (prefix with `_` to ignore) |

## Prettier

| Setting | Value |
|---------|-------|
| Single quotes | `true` |
| Trailing commas | `all` |
| Print width | `100` |
| Tab width | `2` |
| Semicolons | `true` |
| Bracket spacing | `true` |
| Arrow parens | `always` |

## Build Configuration

| Setting | Value | File |
|---------|-------|------|
| Builder | SWC (not tsc) | `nest-cli.json` |
| Type checking | Enabled | `nest-cli.json` |
| Output directory | `dist/` | `nest-cli.json` |
| Clean before build | Yes | `nest-cli.json` |
| Source maps | Enabled | `.swcrc` |

## Jest Configuration

| Setting | Value | File |
|---------|-------|------|
| Transform | ts-jest | `jest.config.ts` |
| Test pattern | `*.spec.ts` | `jest.config.ts` |
| Max workers | 1 | `jest.config.ts` |
| Coverage threshold | 80% all metrics | `jest.config.ts` |
| E2E pattern | `*.e2e-spec.ts` | `test/jest-e2e.json` |

## Git Hooks (Husky)

| Hook | Action |
|------|--------|
| `pre-commit` | `pnpm run lint && tsc --noEmit && pnpm run test` |
| `commit-msg` | `commitlint --edit` |

## Commit Types (commitlint)

Allowed: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `style`
