import { createZodDto } from 'nestjs-zod';

import { UpdateAdminTabSchema } from './update-admin-tab.schema';

export class UpdateAdminTabDto extends createZodDto(UpdateAdminTabSchema) {}
