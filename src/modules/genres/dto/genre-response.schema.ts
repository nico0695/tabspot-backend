import { z } from 'zod';

export const GenreResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export type GenreResponse = z.infer<typeof GenreResponseSchema>;
