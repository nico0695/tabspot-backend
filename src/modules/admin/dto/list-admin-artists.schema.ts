import { z } from 'zod';

export const ListAdminArtistsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  includeDeleted: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

export type ListAdminArtistsParams = z.infer<typeof ListAdminArtistsSchema>;
