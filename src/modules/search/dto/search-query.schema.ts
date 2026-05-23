import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type SearchQueryParams = z.infer<typeof SearchQuerySchema>;
