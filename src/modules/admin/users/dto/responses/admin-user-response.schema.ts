import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminUserResponseSchema = z.object({
  id: z.string().uuid(),
  supabaseAuthId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  role: z.string(),
  status: z.string(),
  blockedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdminUserResponse = z.infer<typeof AdminUserResponseSchema>;

export class AdminUserResponseDto extends createZodDto(AdminUserResponseSchema) {}
