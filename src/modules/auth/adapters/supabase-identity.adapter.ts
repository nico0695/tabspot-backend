import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

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
  private key?: Uint8Array;

  constructor(private readonly config: ConfigService<{ app: Env }>) {}

  onModuleInit(): void {
    const raw = this.config.get('app.SUPABASE_JWT_PUBLIC_KEY', { infer: true });
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new Error('[auth] SUPABASE_JWT_PUBLIC_KEY is not set');
    }
    this.key = new TextEncoder().encode(raw);
  }

  async verifyToken(jwt: string): Promise<IdentityClaims> {
    if (this.key === undefined) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Identity provider not initialized',
      });
    }
    let payload: SupabaseJwtPayload;
    try {
      const result = await jwtVerify(jwt, this.key, {
        algorithms: ['HS256'],
        clockTolerance: 5,
      });
      payload = result.payload as SupabaseJwtPayload;
    } catch (err) {
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
