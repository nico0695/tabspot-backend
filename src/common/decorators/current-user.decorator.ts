import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<{ user: User }>().user,
);
