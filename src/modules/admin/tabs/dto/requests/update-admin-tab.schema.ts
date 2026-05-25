import { z } from 'zod';

import { Difficulty, Instrument, TabStatus, TabType } from '@src/generated/prisma/client';

export const UpdateAdminTabSchema = z.object({
  content: z.string().min(1).max(102_400).optional(),
  tabType: z.nativeEnum(TabType).optional(),
  instrument: z.nativeEnum(Instrument).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  titleOverride: z.string().trim().min(1).max(200).nullish(),
  status: z.nativeEnum(TabStatus).optional(),
  moderationNotes: z.string().trim().min(1).max(2_000).nullable().optional(),
});

export type UpdateAdminTabInput = z.infer<typeof UpdateAdminTabSchema>;
