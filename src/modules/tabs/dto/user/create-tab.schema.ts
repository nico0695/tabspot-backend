import { z } from 'zod';

import { Difficulty, Instrument, TabType } from '@src/generated/prisma/client';

export const CreateTabSchema = z.object({
  songId: z.string().uuid(),
  content: z.string().min(1).max(102_400),
  tabType: z.nativeEnum(TabType),
  instrument: z.nativeEnum(Instrument),
  difficulty: z.nativeEnum(Difficulty),
  titleOverride: z.string().trim().min(1).max(200).optional(),
});

export type CreateTabInput = z.infer<typeof CreateTabSchema>;
