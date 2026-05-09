import { z } from 'zod';

export const UpdateGenreSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

export type UpdateGenreInput = z.infer<typeof UpdateGenreSchema>;
