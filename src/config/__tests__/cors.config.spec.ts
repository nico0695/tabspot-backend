import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import type { Env } from '../app.config';
import { buildCorsOptions } from '../cors.config';

type OriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'production',
    PORT: 3000,
    DATABASE_URL: 'postgresql://tabspot:tabspot@localhost:5432/tabspot',
    DATABASE_URL_TEST: undefined,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_JWT_PUBLIC_KEY: 'test-public-key',
    THROTTLE_TTL: 60,
    THROTTLE_LIMIT: 100,
    CORS_ORIGINS: ['https://app.tabspot.test'],
    CORS_CREDENTIALS: false,
    REQUEST_BODY_LIMIT: '256kb',
    ENABLE_DOCS: false,
    ...overrides,
  };
}

function getOriginDelegate(options: CorsOptions): OriginDelegate {
  if (typeof options.origin !== 'function') {
    throw new Error('Expected CORS origin to be a function');
  }

  return options.origin as OriginDelegate;
}

function checkOrigin(
  options: CorsOptions,
  origin: string | undefined,
): { err: Error | null; allow?: boolean } {
  const delegate = getOriginDelegate(options);
  let result: { err: Error | null; allow?: boolean } | undefined;

  delegate(origin, (err, allow): void => {
    result = { err, allow };
  });

  if (result === undefined) {
    throw new Error('Expected CORS callback to be called synchronously');
  }

  return result;
}

describe('buildCorsOptions', () => {
  it('allows configured origins', (): void => {
    const options = buildCorsOptions(
      makeEnv({ CORS_ORIGINS: ['https://app.tabspot.test', 'https://admin.tabspot.test'] }),
    );

    expect(checkOrigin(options, 'https://admin.tabspot.test')).toEqual({
      err: null,
      allow: true,
    });
  });

  it('rejects origins outside the allowlist', (): void => {
    const options = buildCorsOptions(makeEnv());
    const result = checkOrigin(options, 'https://evil.example');

    expect(result.err).toBeNull();
    expect(result.allow).toBe(false);
  });

  it('allows requests without an Origin header', (): void => {
    const options = buildCorsOptions(makeEnv());

    expect(checkOrigin(options, undefined)).toEqual({ err: null, allow: true });
  });

  it('sets credentials from the typed env value', (): void => {
    const defaultOptions = buildCorsOptions(makeEnv({ CORS_CREDENTIALS: false }));
    const credentialedOptions = buildCorsOptions(makeEnv({ CORS_CREDENTIALS: true }));

    expect(defaultOptions.credentials).toBe(false);
    expect(credentialedOptions.credentials).toBe(true);
  });

  it('preserves the expected methods and headers', (): void => {
    const options = buildCorsOptions(makeEnv());

    expect(options.methods).toEqual(['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']);
    expect(options.allowedHeaders).toEqual(['Authorization', 'Content-Type']);
  });
});
