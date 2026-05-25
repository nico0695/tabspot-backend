import { z } from 'zod';

import { UserStatus } from '@src/generated/prisma/client';

export const ChangeStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]),
});

export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;
