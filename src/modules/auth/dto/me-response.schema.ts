import { z } from 'zod';

import { UserRole, UserStatus } from '@src/generated/prisma/client';

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
