import { z } from 'zod';

export const CreateGenreSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateGenreInput = z.infer<typeof CreateGenreSchema>;
