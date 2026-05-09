import { z } from 'zod';

export const TabListItemSchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  titleOverride: z.string().nullable(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  status: z.string(),
  authorDisplayName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type TabListItem = z.infer<typeof TabListItemSchema>;
