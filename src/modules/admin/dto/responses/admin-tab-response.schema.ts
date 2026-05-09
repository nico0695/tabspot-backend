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

export const AdminTabWithAuthorResponseSchema = AdminTabResponseSchema.extend({
  author: z.object({
    displayName: z.string().nullable(),
  }),
});

export type AdminTabWithAuthorResponse = z.infer<typeof AdminTabWithAuthorResponseSchema>;

export class AdminTabWithAuthorResponseDto extends createZodDto(AdminTabWithAuthorResponseSchema) {}
