import { createZodDto } from 'nestjs-zod';

import { GenreResponseSchema } from './genre-response.schema';

export class GenreResponseDto extends createZodDto(GenreResponseSchema) {}
