import { z } from 'zod';

export const CreateArtistSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sortName: z.string().trim().min(1).max(200).optional(),
});

export type CreateArtistInput = z.infer<typeof CreateArtistSchema>;
