import { z } from 'zod';

export const UpdateSongSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  subtitle: z.string().trim().min(1).max(300).nullable().optional(),
  releaseYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  genreIds: z.array(z.string().uuid()).max(10).optional(),
});

export type UpdateSongInput = z.infer<typeof UpdateSongSchema>;
