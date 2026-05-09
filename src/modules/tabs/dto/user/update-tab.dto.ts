import { createZodDto } from 'nestjs-zod';

import { UpdateTabSchema } from './update-tab.schema';

export class UpdateTabDto extends createZodDto(UpdateTabSchema) {}
