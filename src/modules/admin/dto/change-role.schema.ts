import { z } from 'zod';

import { UserRole } from '@src/generated/prisma/client';

export const ChangeRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export type ChangeRoleInput = z.infer<typeof ChangeRoleSchema>;
