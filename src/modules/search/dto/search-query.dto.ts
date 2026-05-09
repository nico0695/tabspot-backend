import { createZodDto } from 'nestjs-zod';

import { SearchQuerySchema } from './search-query.schema';

export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}
