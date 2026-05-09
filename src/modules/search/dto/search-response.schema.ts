import { z } from 'zod';

export const SearchArtistItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const SearchSongItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export const SearchTabItemSchema = z.object({
  id: z.string().uuid(),
  songTitle: z.string(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  authorDisplayName: z.string().nullable(),
});

export const SearchResponseSchema = z.object({
  artists: z.array(SearchArtistItemSchema),
  songs: z.array(SearchSongItemSchema),
  tabs: z.array(SearchTabItemSchema),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
