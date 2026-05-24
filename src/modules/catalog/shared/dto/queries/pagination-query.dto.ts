import { createZodDto } from 'nestjs-zod';

import { PaginationQuerySchema } from './pagination-query.schema';

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}
