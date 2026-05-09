import { createZodDto } from 'nestjs-zod';

import { ListUserTabsResponseSchema } from './list-user-tabs-response.schema';

export class ListUserTabsResponseDto extends createZodDto(ListUserTabsResponseSchema) {}
