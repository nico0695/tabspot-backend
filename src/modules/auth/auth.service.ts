import { ForbiddenException, Injectable } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';
import { UserStatus } from '@src/generated/prisma/client';

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

  private ensureUserIsActive(user: User): User {
    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account is blocked',
      });
    }

    return user;
  }

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

  async resolveActiveUser(claims: SyncUserClaims): Promise<User> {
    const user = await this.syncUser(claims);

    return this.ensureUserIsActive(user);
  }
}
