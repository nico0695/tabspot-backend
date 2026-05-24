import { z } from 'zod';

import { ArtistResponseSchema } from './artist-response.schema';

export const ListArtistsResponseSchema = z.object({
  data: z.array(ArtistResponseSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListArtistsResponse = z.infer<typeof ListArtistsResponseSchema>;
