import { z } from 'zod';

export const TabRatingResponseSchema = z.object({
  tabId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TabRatingResponse = z.infer<typeof TabRatingResponseSchema>;
