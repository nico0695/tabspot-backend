import { DEFAULT_CORS_ORIGINS, EnvSchema } from '../env.schema';

function makeRawEnv(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://tabspot:tabspot@localhost:5432/tabspot',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_JWT_PUBLIC_KEY: 'test-public-key',
    ...overrides,
  };
}

function fieldErrorsFor(raw: Record<string, unknown>): Record<string, string[] | undefined> {
  const result = EnvSchema.safeParse(raw);
  if (result.success) {
    return {};
  }

  return result.error.flatten().fieldErrors;
}

describe('EnvSchema', () => {
  it('does not require DATABASE_URL_TEST in production', (): void => {
    const result = EnvSchema.safeParse(
      makeRawEnv({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.tabspot.test',
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL_TEST).toBeUndefined();
    }
  });

  it('requires DATABASE_URL_TEST when NODE_ENV is test', (): void => {
    const errors = fieldErrorsFor(makeRawEnv({ NODE_ENV: 'test' }));

    expect(errors['DATABASE_URL_TEST']).toContain(
      'DATABASE_URL_TEST is required when NODE_ENV=test',
    );
  });

  it('accepts DATABASE_URL_TEST when NODE_ENV is test', (): void => {
    const result = EnvSchema.safeParse(
      makeRawEnv({
        NODE_ENV: 'test',
        DATABASE_URL_TEST: 'postgresql://tabspot:tabspot@localhost:5433/tabspot_test',
      }),
    );

    expect(result.success).toBe(true);
  });

  it('requires CORS_ORIGINS in production', (): void => {
    const errors = fieldErrorsFor(makeRawEnv({ NODE_ENV: 'production' }));

    expect(errors['CORS_ORIGINS']).toContain('CORS_ORIGINS is required when NODE_ENV=production');
  });

  it('rejects empty CORS_ORIGINS in production', (): void => {
    const errors = fieldErrorsFor(makeRawEnv({ NODE_ENV: 'production', CORS_ORIGINS: '  ,  ' }));

    expect(errors['CORS_ORIGINS']).toContain('CORS_ORIGINS is required when NODE_ENV=production');
  });

  it('rejects wildcard CORS_ORIGINS in production', (): void => {
    const errors = fieldErrorsFor(makeRawEnv({ NODE_ENV: 'production', CORS_ORIGINS: '*' }));

    expect(errors['CORS_ORIGINS']).toContain('Wildcard CORS origins are not allowed in production');
  });

  it('parses comma-separated CORS origins', (): void => {
    const result = EnvSchema.safeParse(
      makeRawEnv({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.tabspot.test, https://admin.tabspot.test ',
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual([
        'https://app.tabspot.test',
        'https://admin.tabspot.test',
      ]);
    }
  });

  it('uses local development CORS origins when none are provided outside production', (): void => {
    const result = EnvSchema.safeParse(makeRawEnv());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_ORIGINS).toEqual(DEFAULT_CORS_ORIGINS);
    }
  });

  it('defaults CORS credentials to false and parses explicit true', (): void => {
    const defaultResult = EnvSchema.safeParse(makeRawEnv());
    const explicitResult = EnvSchema.safeParse(makeRawEnv({ CORS_CREDENTIALS: 'true' }));

    expect(defaultResult.success).toBe(true);
    expect(explicitResult.success).toBe(true);
    if (defaultResult.success && explicitResult.success) {
      expect(defaultResult.data.CORS_CREDENTIALS).toBe(false);
      expect(explicitResult.data.CORS_CREDENTIALS).toBe(true);
    }
  });

  it('defaults and normalizes REQUEST_BODY_LIMIT', (): void => {
    const defaultResult = EnvSchema.safeParse(makeRawEnv());
    const explicitResult = EnvSchema.safeParse(makeRawEnv({ REQUEST_BODY_LIMIT: '1MB' }));

    expect(defaultResult.success).toBe(true);
    expect(explicitResult.success).toBe(true);
    if (defaultResult.success && explicitResult.success) {
      expect(defaultResult.data.REQUEST_BODY_LIMIT).toBe('256kb');
      expect(explicitResult.data.REQUEST_BODY_LIMIT).toBe('1mb');
    }
  });

  it('rejects invalid REQUEST_BODY_LIMIT values', (): void => {
    const errors = fieldErrorsFor(makeRawEnv({ REQUEST_BODY_LIMIT: 'large' }));

    expect(errors['REQUEST_BODY_LIMIT']).toContain('Expected a size like 256kb or 1mb');
  });
});
