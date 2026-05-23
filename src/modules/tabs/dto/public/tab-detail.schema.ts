import { z } from 'zod';

const TabSongArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

const TabSongGenreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

const TabSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  artist: TabSongArtistSchema,
  genres: z.array(TabSongGenreSchema),
});

export const TabDetailSchema = z.object({
  id: z.string().uuid(),
  authorUserId: z.string().uuid(),
  titleOverride: z.string().nullable(),
  content: z.string(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  status: z.string(),
  authorDisplayName: z.string().nullable(),
  versionNumber: z.number().int(),
  submittedAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  song: TabSongSchema,
});

export type TabDetail = z.infer<typeof TabDetailSchema>;
