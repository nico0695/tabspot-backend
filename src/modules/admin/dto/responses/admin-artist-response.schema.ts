import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminArtistResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sortName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type AdminArtistResponse = z.infer<typeof AdminArtistResponseSchema>;

export class AdminArtistResponseDto extends createZodDto(AdminArtistResponseSchema) {}
