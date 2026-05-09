import { z } from 'zod';

import { Difficulty, Instrument, TabType } from '@src/generated/prisma/client';

export const UpdateTabSchema = z.object({
  content: z.string().min(1).max(102_400).optional(),
  tabType: z.nativeEnum(TabType).optional(),
  instrument: z.nativeEnum(Instrument).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  titleOverride: z.string().trim().min(1).max(200).nullish(),
});

export type UpdateTabInput = z.infer<typeof UpdateTabSchema>;
