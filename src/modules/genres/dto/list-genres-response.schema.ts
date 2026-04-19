import { z } from 'zod';

import { GenreResponseSchema } from './genre-response.schema';

export const ListGenresResponseSchema = z.object({
  data: z.array(GenreResponseSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListGenresResponse = z.infer<typeof ListGenresResponseSchema>;
