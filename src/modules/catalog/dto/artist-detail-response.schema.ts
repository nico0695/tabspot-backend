import { z } from 'zod';

const ArtistSongSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  publishedTabCount: z.number().int(),
});

export const ArtistDetailResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sortName: z.string().nullable(),
  songs: z.array(ArtistSongSummarySchema),
});

export type ArtistSongSummary = z.infer<typeof ArtistSongSummarySchema>;
export type ArtistDetailResponse = z.infer<typeof ArtistDetailResponseSchema>;
