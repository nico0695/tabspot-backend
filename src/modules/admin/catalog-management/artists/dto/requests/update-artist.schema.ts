import { z } from 'zod';

export const UpdateArtistSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sortName: z.string().trim().min(1).max(200).nullable().optional(),
});

export type UpdateArtistInput = z.infer<typeof UpdateArtistSchema>;
