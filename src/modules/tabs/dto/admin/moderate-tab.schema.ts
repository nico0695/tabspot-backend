import { z } from 'zod';

export const ModerateTabSchema = z.object({
  moderationNotes: z.string().trim().min(1).max(2000).optional(),
});

export type ModerateTabInput = z.infer<typeof ModerateTabSchema>;
