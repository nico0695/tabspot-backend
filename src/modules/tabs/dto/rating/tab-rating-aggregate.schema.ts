import { z } from 'zod';

export const TabRatingAggregateSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().min(0),
});

export type TabRatingAggregate = z.infer<typeof TabRatingAggregateSchema>;
