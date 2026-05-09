import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminSongResponseSchema = z.object({
  id: z.string().uuid(),
  artistId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  songGenres: z.array(
    z.object({
      genre: z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
      }),
    }),
  ),
});

export type AdminSongResponse = z.infer<typeof AdminSongResponseSchema>;

export class AdminSongResponseDto extends createZodDto(AdminSongResponseSchema) {}
