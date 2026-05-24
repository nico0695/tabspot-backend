import { z } from 'zod';

export const ArtistSelectResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export type ArtistSelectResponse = z.infer<typeof ArtistSelectResponseSchema>;
