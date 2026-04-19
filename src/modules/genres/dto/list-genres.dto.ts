import { createZodDto } from 'nestjs-zod';

import { ListGenresSchema } from './list-genres.schema';

export class ListGenresDto extends createZodDto(ListGenresSchema) {}
