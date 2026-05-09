import { createZodDto } from 'nestjs-zod';

import { UpdateGenreSchema } from './update-genre.schema';

export class UpdateGenreDto extends createZodDto(UpdateGenreSchema) {}
