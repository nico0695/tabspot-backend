import { createZodDto } from 'nestjs-zod';

import { CreateGenreSchema } from './create-genre.schema';

export class CreateGenreDto extends createZodDto(CreateGenreSchema) {}
