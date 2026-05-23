import { z } from 'zod';

export const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const REQUEST_BODY_LIMIT_PATTERN = /^\d+(kb|mb)$/i;

function isValidCorsOrigin(origin: string): boolean {
  if (origin === '*') {
    return true;
  }

  try {
    void new URL(origin);
    return true;
  } catch {
    return false;
  }
}

const BooleanFromEnvSchema = z.preprocess((value) => {
  if (value === undefined) {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}, z.boolean());

const CorsOriginsSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  },
  z
    .array(
      z.string().refine(isValidCorsOrigin, {
        message: 'Expected a valid URL origin or *',
      }),
    )
    .optional(),
);

const RequestBodyLimitSchema = z.preprocess(
  (value) => value ?? '256kb',
  z
    .string()
    .trim()
    .regex(REQUEST_BODY_LIMIT_PATTERN, 'Expected a size like 256kb or 1mb')
    .transform((value): string => value.toLowerCase()),
);

const EnvBaseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_PUBLIC_KEY: z.string().min(1),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  CORS_ORIGINS: CorsOriginsSchema,
  CORS_CREDENTIALS: BooleanFromEnvSchema,
  REQUEST_BODY_LIMIT: RequestBodyLimitSchema,
  ENABLE_DOCS: BooleanFromEnvSchema,
});

export const EnvSchema = EnvBaseSchema.superRefine((env, ctx): void => {
  if (env.NODE_ENV === 'test' && env.DATABASE_URL_TEST === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL_TEST'],
      message: 'DATABASE_URL_TEST is required when NODE_ENV=test',
    });
  }

  if (env.NODE_ENV === 'production') {
    if (env.CORS_ORIGINS === undefined || env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS is required when NODE_ENV=production',
      });
    }

    if (env.CORS_ORIGINS?.includes('*')) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'Wildcard CORS origins are not allowed in production',
      });
    }
  }
}).transform((env) => ({
  ...env,
  CORS_ORIGINS:
    env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS.length > 0
      ? env.CORS_ORIGINS
      : [...DEFAULT_CORS_ORIGINS],
}));

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      '[config] Invalid environment variables:\n',
      JSON.stringify(result.error.flatten(), null, 2),
    );
    throw new Error('Invalid environment variables. See errors above.');
  }
  return result.data;
}
