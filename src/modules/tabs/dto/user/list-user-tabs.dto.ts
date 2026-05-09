import { createZodDto } from 'nestjs-zod';

import { ListUserTabsSchema } from './list-user-tabs.schema';

export class ListUserTabsDto extends createZodDto(ListUserTabsSchema) {}
