import { createZodDto } from 'nestjs-zod';

import { RateTabSchema } from './rate-tab.schema';

export class RateTabDto extends createZodDto(RateTabSchema) {}
