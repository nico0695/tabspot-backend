import { createZodDto } from 'nestjs-zod';

import { ListPublishedTabsSchema } from './list-published-tabs.schema';

export class ListPublishedTabsDto extends createZodDto(ListPublishedTabsSchema) {}
