import { z } from 'zod';

import { SongResponseSchema } from './song-response.schema';

export const ListSongsResponseSchema = z.object({
  data: z.array(SongResponseSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListSongsResponse = z.infer<typeof ListSongsResponseSchema>;
