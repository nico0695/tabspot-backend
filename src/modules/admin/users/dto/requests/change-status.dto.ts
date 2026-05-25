import { createZodDto } from 'nestjs-zod';

import { ChangeStatusSchema } from './change-status.schema';

export class ChangeStatusDto extends createZodDto(ChangeStatusSchema) {}
