import { z } from 'zod';

export const UpdateMeSchema = z.object({
  displayName: z.string().trim().min(2).max(50).nullable().optional(),
});

export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
