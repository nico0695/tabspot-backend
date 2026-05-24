import { z } from 'zod';

export const SongResponseSchema = z.object({
  id: z.string().uuid(),
  artistId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
});

export type SongResponse = z.infer<typeof SongResponseSchema>;
