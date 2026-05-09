import { createZodDto } from 'nestjs-zod';

import { CreateTabSchema } from './create-tab.schema';

export class CreateTabDto extends createZodDto(CreateTabSchema) {}
