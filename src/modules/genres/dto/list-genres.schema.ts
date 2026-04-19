import { z } from 'zod';

export const ListGenresSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListGenresParams = z.infer<typeof ListGenresSchema>;
