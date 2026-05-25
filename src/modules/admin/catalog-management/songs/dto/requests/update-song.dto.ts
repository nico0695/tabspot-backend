import { createZodDto } from 'nestjs-zod';

import { UpdateSongSchema } from './update-song.schema';

export class UpdateSongDto extends createZodDto(UpdateSongSchema) {}
