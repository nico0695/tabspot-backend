import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { User } from '@src/generated/prisma/client';

import { AuthService } from '@modules/auth/auth.service';
import {
  IDENTITY_PROVIDER,
  type IIdentityProvider,
} from '@modules/auth/ports/identity-provider.port';

const BEARER_PATTERN = /^Bearer (.+)$/;

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_PROVIDER) private readonly idp: IIdentityProvider,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    const header = request.headers.authorization;

    if (typeof header !== 'string') {
      return true;
    }

    const match = BEARER_PATTERN.exec(header);
    if (match === null) {
      return true;
    }

    const claims = await this.idp.verifyToken(match[1]);
    const user = await this.auth.syncUser({
      sub: claims.sub,
      email: claims.email,
      displayName: claims.displayName,
    });
    request.user = user;
    return true;
  }
}
