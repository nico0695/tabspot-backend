import { z } from 'zod';

import { Difficulty, Instrument, TabType } from '@src/generated/prisma/client';

export const ListPublishedTabsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  songId: z.string().uuid().optional(),
  tabType: z.nativeEnum(TabType).optional(),
  instrument: z.nativeEnum(Instrument).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

export type ListPublishedTabsParams = z.infer<typeof ListPublishedTabsSchema>;
