import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '@src/generated/prisma/client';

export const ROLES_METADATA_KEY = 'auth:roles';

export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
