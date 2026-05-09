import { createZodDto } from 'nestjs-zod';

import { ListPublishedTabsResponseSchema } from './list-published-tabs-response.schema';

export class ListPublishedTabsResponseDto extends createZodDto(ListPublishedTabsResponseSchema) {}
