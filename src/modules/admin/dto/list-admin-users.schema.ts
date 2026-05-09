import { z } from 'zod';

import { UserRole, UserStatus } from '@src/generated/prisma/client';

export const ListAdminUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type ListAdminUsersParams = z.infer<typeof ListAdminUsersSchema>;
