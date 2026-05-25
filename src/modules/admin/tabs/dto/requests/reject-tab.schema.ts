import { z } from 'zod';

export const RejectTabSchema = z.object({
  notes: z.string().trim().min(1).max(2000),
});

export type RejectTabInput = z.infer<typeof RejectTabSchema>;
