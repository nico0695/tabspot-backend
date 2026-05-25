import { z } from 'zod';

export const CreateSongSchema = z.object({
  artistId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  subtitle: z.string().trim().min(1).max(300).optional(),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional(),
  genreIds: z.array(z.string().uuid()).max(10).optional(),
});

export type CreateSongInput = z.infer<typeof CreateSongSchema>;
