import { Injectable } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';

import { UserRepository } from './repositories/user.repository';

export interface SyncUserClaims {
  sub: string;
  email: string;
  displayName: string | null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async syncUser(claims: SyncUserClaims): Promise<User> {
    const existing = await this.users.findBySupabaseAuthId(claims.sub);
    if (existing !== null) {
      return existing;
    }

    try {
      return await this.users.create({
        supabaseAuthId: claims.sub,
        email: claims.email,
        displayName: claims.displayName,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) {
        throw err;
      }
      const recovered = await this.users.findBySupabaseAuthId(claims.sub);
      if (recovered === null) {
        throw err;
      }
      return recovered;
    }
  }
}
