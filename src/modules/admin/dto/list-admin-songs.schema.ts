import { z } from 'zod';

export const ListAdminSongsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  artistId: z.string().uuid().optional(),
  includeDeleted: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

export type ListAdminSongsParams = z.infer<typeof ListAdminSongsSchema>;
