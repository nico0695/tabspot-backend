import { createZodDto } from 'nestjs-zod';

import { CreateAdminTabSchema } from './create-admin-tab.schema';

export class CreateAdminTabDto extends createZodDto(CreateAdminTabSchema) {}
