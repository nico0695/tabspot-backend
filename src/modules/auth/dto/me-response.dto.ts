import { createZodDto } from 'nestjs-zod';

import { MeResponseSchema } from './me-response.schema';

export class MeResponseDto extends createZodDto(MeResponseSchema) {}
