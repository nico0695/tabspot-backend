import { z } from 'zod';

export const ListSongsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(100).optional(),
  artistId: z.string().uuid().optional(),
});

export type ListSongsParams = z.infer<typeof ListSongsSchema>;
