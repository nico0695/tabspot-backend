import { z } from 'zod';

import { UserTabResponseSchema } from './user-tab-response.schema';

export const ListUserTabsResponseSchema = z.object({
  data: z.array(UserTabResponseSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListUserTabsResponse = z.infer<typeof ListUserTabsResponseSchema>;
