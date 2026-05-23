import { createZodDto } from 'nestjs-zod';

import { UpdateMeSchema } from './update-me.schema';

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
