import { z } from 'zod';

const SongTabSummarySchema = z.object({
  id: z.string().uuid(),
  titleOverride: z.string().nullable(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  authorDisplayName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const SongArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

const SongGenreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const SongDetailResponseSchema = z.object({
  id: z.string().uuid(),
  artistId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  artist: SongArtistSchema,
  genres: z.array(SongGenreSchema),
  tabs: z.object({
    data: z.array(SongTabSummarySchema),
    pageInfo: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
  }),
});

export type SongTabSummary = z.infer<typeof SongTabSummarySchema>;
export type SongDetailResponse = z.infer<typeof SongDetailResponseSchema>;
