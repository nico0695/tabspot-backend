import { z } from 'zod';

import { TabStatus } from '@src/generated/prisma/client';

export const ListTabsAdminSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(TabStatus).optional(),
  includeDeleted: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

export type ListTabsAdminParams = z.infer<typeof ListTabsAdminSchema>;
