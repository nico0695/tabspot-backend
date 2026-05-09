import { createZodDto } from 'nestjs-zod';

import { HealthResponseSchema } from './health-response.schema';

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
