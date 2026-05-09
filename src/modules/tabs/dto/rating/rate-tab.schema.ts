import { z } from 'zod';

export const RateTabSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type RateTabInput = z.infer<typeof RateTabSchema>;
