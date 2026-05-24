import { z } from 'zod';

import { Difficulty, Instrument, TabStatus, TabType } from '@src/generated/prisma/client';

export const CreateAdminTabSchema = z.object({
  songId: z.string().uuid(),
  content: z.string().min(1).max(102_400),
  tabType: z.nativeEnum(TabType),
  instrument: z.nativeEnum(Instrument),
  difficulty: z.nativeEnum(Difficulty),
  titleOverride: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(TabStatus).optional(),
  moderationNotes: z.string().trim().min(1).max(2_000).nullable().optional(),
});

export type CreateAdminTabInput = z.infer<typeof CreateAdminTabSchema>;
