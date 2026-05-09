import { createZodDto } from 'nestjs-zod';

import { CreateSongSchema } from './create-song.schema';

export class CreateSongDto extends createZodDto(CreateSongSchema) {}
