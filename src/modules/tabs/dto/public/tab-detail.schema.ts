import { z } from 'zod';

export const TabDetailSchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  titleOverride: z.string().nullable(),
  content: z.string(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  status: z.string(),
  authorDisplayName: z.string().nullable(),
  versionNumber: z.number().int(),
  submittedAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TabDetail = z.infer<typeof TabDetailSchema>;
