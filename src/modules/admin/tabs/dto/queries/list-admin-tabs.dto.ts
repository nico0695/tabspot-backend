import { createZodDto } from 'nestjs-zod';

import { ListAdminTabsSchema } from './list-admin-tabs.schema';

export class ListAdminTabsDto extends createZodDto(ListAdminTabsSchema) {}
