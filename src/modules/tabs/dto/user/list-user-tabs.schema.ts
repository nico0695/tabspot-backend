import { z } from 'zod';

export const ListUserTabsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListUserTabsParams = z.infer<typeof ListUserTabsSchema>;
