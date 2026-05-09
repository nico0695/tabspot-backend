import { createZodDto } from 'nestjs-zod';

import { ListGenresResponseSchema } from './list-genres-response.schema';

export class ListGenresResponseDto extends createZodDto(ListGenresResponseSchema) {}
