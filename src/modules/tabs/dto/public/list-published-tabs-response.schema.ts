import { z } from 'zod';

import { TabListItemSchema } from './tab-list-item.schema';

export const ListPublishedTabsResponseSchema = z.object({
  data: z.array(TabListItemSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListPublishedTabsResponse = z.infer<typeof ListPublishedTabsResponseSchema>;
