import { createZodDto } from 'nestjs-zod';

import { SearchResponseSchema } from './search-response.schema';

export class SearchResponseDto extends createZodDto(SearchResponseSchema) {}
