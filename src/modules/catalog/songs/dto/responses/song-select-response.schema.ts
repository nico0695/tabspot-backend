import { z } from 'zod';

export const SongSelectResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
});

export type SongSelectResponse = z.infer<typeof SongSelectResponseSchema>;
