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
  submittedAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TabDetail = z.infer<typeof TabDetailSchema>;
