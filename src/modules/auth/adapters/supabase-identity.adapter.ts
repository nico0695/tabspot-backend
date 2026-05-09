import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, decodeProtectedHeader, importSPKI, jwtVerify } from 'jose';

import type { Env } from '@config/app.config';

import type { IIdentityProvider, IdentityClaims } from '../ports/identity-provider.port';

interface SupabaseJwtPayload {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
  email_confirmed?: unknown;
  user_metadata?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractDisplayName(metadata: unknown): string | null {
  if (!isObject(metadata)) {
    return null;
  }
  const fullName = metadata['full_name'];
  return typeof fullName === 'string' ? fullName : null;
}

function getErrorCode(error: unknown): string | null {
  if (isObject(error) && typeof error['code'] === 'string') {
    return error['code'];
  }
  return null;
}

function normalizeVerificationError(error: unknown): UnauthorizedException {
  const code = getErrorCode(error);
  if (code === 'ERR_JWT_EXPIRED') {
    return new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expired' });
  }
  return new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid token' });
}

@Injectable()
export class SupabaseIdentityAdapter implements IIdentityProvider, OnModuleInit {
  private rawKey?: string;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService<{ app: Env }>) {}

  onModuleInit(): void {
    const raw = this.config.get('app.SUPABASE_JWT_PUBLIC_KEY', { infer: true });
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new Error('[auth] SUPABASE_JWT_PUBLIC_KEY is not set');
    }
    this.rawKey = raw;

    const supabaseUrl = this.config.get('app.SUPABASE_URL', { infer: true });
    if (typeof supabaseUrl === 'string' && supabaseUrl.length > 0) {
      this.jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl));
    }
  }

  private async resolveVerificationKey(
    jwt: string,
  ): Promise<
    | { type: 'local'; key: CryptoKey | Uint8Array }
    | { type: 'remote'; key: ReturnType<typeof createRemoteJWKSet> }
  > {
    if (this.rawKey === undefined) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Identity provider not initialized',
      });
    }

    const { alg } = decodeProtectedHeader(jwt);
    if (alg === 'HS256') {
      return { type: 'local', key: new TextEncoder().encode(this.rawKey) };
    }

    if (alg !== 'ES256' && alg !== 'RS256') {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    }

    if (this.rawKey.includes('BEGIN PUBLIC KEY')) {
      const normalizedKey = this.rawKey.includes('\\n')
        ? this.rawKey.replace(/\\n/g, '\n')
        : this.rawKey;
      return { type: 'local', key: await importSPKI(normalizedKey, alg) };
    }

    if (this.jwks !== undefined) {
      return { type: 'remote', key: this.jwks };
    }

    const normalizedKey = this.rawKey.includes('\\n')
      ? this.rawKey.replace(/\\n/g, '\n')
      : this.rawKey;
    return { type: 'local', key: await importSPKI(normalizedKey, alg) };
  }

  async verifyToken(jwt: string): Promise<IdentityClaims> {
    let payload: SupabaseJwtPayload;
    try {
      const verificationKey = await this.resolveVerificationKey(jwt);
      const result =
        verificationKey.type === 'remote'
          ? await jwtVerify(jwt, verificationKey.key, {
              algorithms: ['HS256', 'ES256', 'RS256'],
              clockTolerance: 5,
            })
          : await jwtVerify(jwt, verificationKey.key, {
              algorithms: ['HS256', 'ES256', 'RS256'],
              clockTolerance: 5,
            });
      payload = result.payload as SupabaseJwtPayload;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw normalizeVerificationError(err);
    }

    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    if (sub === null || email === null || exp === null) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    }

    return {
      sub,
      email,
      displayName: extractDisplayName(payload.user_metadata),
      emailConfirmed: payload.email_confirmed === true,
      exp,
    };
  }
}
