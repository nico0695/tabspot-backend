import { createZodDto } from 'nestjs-zod';

import { TabListItemSchema } from './tab-list-item.schema';

export class TabListItemDto extends createZodDto(TabListItemSchema) {}
