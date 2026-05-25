import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminTabResponseSchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  titleOverride: z.string().nullable(),
  content: z.string(),
  tabType: z.string(),
  instrument: z.string(),
  difficulty: z.string(),
  status: z.string(),
  submittedAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  moderatedByUserId: z.string().uuid().nullable(),
  moderationNotes: z.string().nullable(),
  versionNumber: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type AdminTabResponse = z.infer<typeof AdminTabResponseSchema>;

export class AdminTabResponseDto extends createZodDto(AdminTabResponseSchema) {}

export const AdminTabAuthorResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().nullable(),
  email: z.string(),
  status: z.string(),
  role: z.string(),
});

export const AdminTabSongResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  deletedAt: z.string().datetime().nullable(),
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export const AdminTabWithRelationsResponseSchema = AdminTabResponseSchema.extend({
  author: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    email: z.string(),
    status: z.string(),
    role: z.string(),
  }),
  song: AdminTabSongResponseSchema,
});

export type AdminTabWithRelationsResponse = z.infer<typeof AdminTabWithRelationsResponseSchema>;

export class AdminTabWithRelationsResponseDto extends createZodDto(
  AdminTabWithRelationsResponseSchema,
) {}

export const AdminTabWithAuthorResponseSchema = AdminTabWithRelationsResponseSchema;
export type AdminTabWithAuthorResponse = AdminTabWithRelationsResponse;
export class AdminTabWithAuthorResponseDto extends createZodDto(AdminTabWithAuthorResponseSchema) {}
