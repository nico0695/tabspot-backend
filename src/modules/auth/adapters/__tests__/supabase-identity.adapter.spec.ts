import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import type { Env } from '@config/app.config';

import { SupabaseIdentityAdapter } from '../supabase-identity.adapter';

type GeneratedKeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

function makeConfig(value: string | undefined | null): {
  config: ConfigService<{ app: Env }>;
  getMock: jest.Mock;
} {
  const getMock = jest.fn().mockReturnValue(value);
  const config = { get: getMock } as unknown as ConfigService<{ app: Env }>;
  return { config, getMock };
}

describe('SupabaseIdentityAdapter', () => {
  let publicKey: GeneratedKeyPair['publicKey'];
  let privateKey: GeneratedKeyPair['privateKey'];
  let jwkString: string;

  beforeAll(async (): Promise<void> => {
    const keyPair = await generateKeyPair('ES256', { extractable: true });
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
    const jwk = await exportJWK(publicKey);
    jwk.alg = 'ES256';
    jwkString = JSON.stringify(jwk);
  });

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
    let builder = new SignJWT(payload).setProtectedHeader({ alg: 'ES256' });
    if (opts.sub !== undefined) {
      builder = builder.setSubject(opts.sub);
    }
    builder = builder.setIssuedAt(now).setExpirationTime(now + (opts.expSecondsFromNow ?? 3600));
    return builder.sign(privateKey);
  }

  describe('onModuleInit', () => {
    it('loads the JWK from env successfully', async (): Promise<void> => {
      const { config, getMock } = makeConfig(jwkString);
      const adapter = new SupabaseIdentityAdapter(config);

      await expect(adapter.onModuleInit()).resolves.toBeUndefined();
      expect(getMock).toHaveBeenCalledWith('app.SUPABASE_JWT_PUBLIC_KEY', { infer: true });
    });

    it('throws when env var is undefined', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig(undefined).config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        '[auth] SUPABASE_JWT_PUBLIC_KEY is not set',
      );
    });

    it('throws when env var is null (non-string)', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig(null).config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        '[auth] SUPABASE_JWT_PUBLIC_KEY is not set',
      );
    });

    it('throws when env var is an empty string', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('').config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        '[auth] SUPABASE_JWT_PUBLIC_KEY is not set',
      );
    });

    it('throws with [auth] prefix when env value is not valid JSON', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('not-json').config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        /^\[auth\] SUPABASE_JWT_PUBLIC_KEY is not a valid JWK:/,
      );
    });

    it('throws "not an object" when env value parses to a JSON string primitive', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('"just-a-string"').config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        '[auth] SUPABASE_JWT_PUBLIC_KEY is not a valid JWK: not an object',
      );
    });

    it('throws "not an object" when env value parses to JSON null', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('null').config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        '[auth] SUPABASE_JWT_PUBLIC_KEY is not a valid JWK: not an object',
      );
    });

    it('throws with [auth] prefix when JWK structure is invalid (importJWK fails)', async (): Promise<void> => {
      const adapter = new SupabaseIdentityAdapter(makeConfig('{"foo":"bar"}').config);
      await expect(adapter.onModuleInit()).rejects.toThrow(
        /^\[auth\] SUPABASE_JWT_PUBLIC_KEY is not a valid JWK:/,
      );
    });
  });

  describe('verifyToken', () => {
    let adapter: SupabaseIdentityAdapter;

    beforeEach(async (): Promise<void> => {
      adapter = new SupabaseIdentityAdapter(makeConfig(jwkString).config);
      await adapter.onModuleInit();
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

    it('throws INVALID_TOKEN when signature does not match the loaded JWK', async (): Promise<void> => {
      const otherKeyPair = await generateKeyPair('ES256', { extractable: true });
      const now = Math.floor(Date.now() / 1000);
      const badToken = await new SignJWT({ email: 'a@b.com' })
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject('user-8')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(otherKeyPair.privateKey);

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
      const uninit = new SupabaseIdentityAdapter(makeConfig(jwkString).config);
      await expect(uninit.verifyToken('any.token.here')).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN', message: 'Identity provider not initialized' },
      });
    });
  });
});
