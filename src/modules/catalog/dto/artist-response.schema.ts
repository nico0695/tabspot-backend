import { z } from 'zod';

export const ArtistResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sortName: z.string().nullable(),
});

export type ArtistResponse = z.infer<typeof ArtistResponseSchema>;
