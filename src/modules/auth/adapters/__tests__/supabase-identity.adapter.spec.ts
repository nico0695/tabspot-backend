import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';

import type { Env } from '@config/app.config';

import { SupabaseIdentityAdapter } from '../supabase-identity.adapter';

const TEST_SECRET = 'test-jwt-secret-that-is-long-enough-for-hs256-validation';
const SECRET_KEY = new TextEncoder().encode(TEST_SECRET);

function makeConfig(value: string | undefined | null): {
  config: ConfigService<{ app: Env }>;
  getMock: jest.Mock;
} {
  const getMock = jest.fn().mockReturnValue(value);
  const config = { get: getMock } as unknown as ConfigService<{ app: Env }>;
  return { config, getMock };
}

describe('SupabaseIdentityAdapter', () => {
  async function signTestJwt(
    opts: {
      sub?: string;
      email?: string;
      emailConfirmed?: boolean;
      expSecondsFromNow?: number;
      fullName?: string;
      userMetadata?: unknown;
    } = {},
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {};
    if (opts.email !== undefined) {
      payload['email'] = opts.email;
    }
    if (opts.emailConfirmed !== undefined) {
      payload['email_confirmed'] = opts.emailConfirmed;
    }
    if (opts.userMetadata !== undefined) {
      payload['user_metadata'] = opts.userMetadata;
    } else if (opts.fullName !== undefined) {
      payload['user_metadata'] = { full_name: opts.fullName };
    }
    let builder = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' });
    if (opts.sub !== undefined) {
      builder = builder.setSubject(opts.sub);
    }
    builder = builder.setIssuedAt(now).setExpirationTime(now + (opts.expSecondsFromNow ?? 3600));
    return builder.sign(SECRET_KEY);
  }

  describe('onModuleInit', () => {
    it('loads the secret from env successfully', (): void => {
      const { config, getMock } = makeConfig(TEST_SECRET);
      const adapter = new SupabaseIdentityAdapter(config);

      expect(() => adapter.onModuleInit()).not.toThrow();
      expect(getMock).toHaveBeenCalledWith('app.SUPABASE_JWT_PUBLIC_KEY', { infer: true });
    });

    it('throws when env var is undefined', (): void => {
      const adapter = new SupabaseIdentityAdapter(makeConfig(undefined).config);
      expect(() => adapter.onModuleInit()).toThrow('[auth] SUPABASE_JWT_PUBLIC_KEY is not set');
    });

    it('throws when env var is null (non-string)', (): void => {
      const adapter = new SupabaseIdentityAdapter(makeConfig(null).config);
      expect(() => adapter.onModuleInit()).toThrow('[auth] SUPABASE_JWT_PUBLIC_KEY is not set');
    });

    it('throws when env var is an empty string', (): void => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('').config);
      expect(() => adapter.onModuleInit()).toThrow('[auth] SUPABASE_JWT_PUBLIC_KEY is not set');
    });
  });

  describe('verifyToken', () => {
    let adapter: SupabaseIdentityAdapter;

    beforeEach((): void => {
      adapter = new SupabaseIdentityAdapter(makeConfig(TEST_SECRET).config);
      adapter.onModuleInit();
    });

    it('returns IdentityClaims for a valid token (full_name present, email_confirmed true)', async (): Promise<void> => {
      const token = await signTestJwt({
        sub: 'user-1',
        email: 'a@b.com',
        emailConfirmed: true,
        fullName: 'Test User',
      });

      const claims = await adapter.verifyToken(token);

      expect(claims).toMatchObject({
        sub: 'user-1',
        email: 'a@b.com',
        displayName: 'Test User',
        emailConfirmed: true,
      });
      expect(typeof claims.exp).toBe('number');
    });

    it('returns displayName: null when user_metadata is absent', async (): Promise<void> => {
      const token = await signTestJwt({ sub: 'user-2', email: 'a@b.com' });
      const claims = await adapter.verifyToken(token);
      expect(claims.displayName).toBeNull();
    });

    it('returns displayName: null when user_metadata is not an object', async (): Promise<void> => {
      const token = await signTestJwt({
        sub: 'user-3',
        email: 'a@b.com',
        userMetadata: 'not-an-object',
      });
      const claims = await adapter.verifyToken(token);
      expect(claims.displayName).toBeNull();
    });

    it('returns displayName: null when user_metadata.full_name is not a string', async (): Promise<void> => {
      const token = await signTestJwt({
        sub: 'user-4',
        email: 'a@b.com',
        userMetadata: { full_name: 42 },
      });
      const claims = await adapter.verifyToken(token);
      expect(claims.displayName).toBeNull();
    });

    it('returns emailConfirmed: false when claim is missing', async (): Promise<void> => {
      const token = await signTestJwt({ sub: 'user-5', email: 'a@b.com' });
      const claims = await adapter.verifyToken(token);
      expect(claims.emailConfirmed).toBe(false);
    });

    it('returns emailConfirmed: false when claim is literally false', async (): Promise<void> => {
      const token = await signTestJwt({
        sub: 'user-6',
        email: 'a@b.com',
        emailConfirmed: false,
      });
      const claims = await adapter.verifyToken(token);
      expect(claims.emailConfirmed).toBe(false);
    });

    it('throws TOKEN_EXPIRED when JWT exp is past clockTolerance', async (): Promise<void> => {
      const token = await signTestJwt({
        sub: 'user-7',
        email: 'a@b.com',
        expSecondsFromNow: -100,
      });
      await expect(adapter.verifyToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(adapter.verifyToken(token)).rejects.toMatchObject({
        response: { code: 'TOKEN_EXPIRED' },
      });
    });

    it('throws INVALID_TOKEN when signature does not match', async (): Promise<void> => {
      const wrongKey = new TextEncoder().encode('wrong-secret-key-that-is-long-enough');
      const now = Math.floor(Date.now() / 1000);
      const badToken = await new SignJWT({ email: 'a@b.com' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user-8')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(wrongKey);

      await expect(adapter.verifyToken(badToken)).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN' },
      });
    });

    it('throws INVALID_TOKEN when token is structurally invalid (not a JWT)', async (): Promise<void> => {
      await expect(adapter.verifyToken('not.a.jwt')).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN' },
      });
    });

    it('throws INVALID_TOKEN when sub claim is missing', async (): Promise<void> => {
      const token = await signTestJwt({ email: 'a@b.com' });
      await expect(adapter.verifyToken(token)).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN' },
      });
    });

    it('throws INVALID_TOKEN when email claim is missing', async (): Promise<void> => {
      const token = await signTestJwt({ sub: 'user-9' });
      await expect(adapter.verifyToken(token)).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN' },
      });
    });

    it('throws INVALID_TOKEN when verifyToken is called before onModuleInit', async (): Promise<void> => {
      const uninit = new SupabaseIdentityAdapter(makeConfig(undefined).config);
      await expect(uninit.verifyToken('any.token.here')).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN', message: 'Identity provider not initialized' },
      });
    });
  });
});
