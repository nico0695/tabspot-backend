import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminGenreResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type AdminGenreResponse = z.infer<typeof AdminGenreResponseSchema>;

export class AdminGenreResponseDto extends createZodDto(AdminGenreResponseSchema) {}
