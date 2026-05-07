import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { User, UserRole } from '@src/generated/prisma/client';

import { ROLES_METADATA_KEY } from '@common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_METADATA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (required === undefined || required.length === 0) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (user === undefined || !required.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient role',
      });
    }
    return true;
  }
}
