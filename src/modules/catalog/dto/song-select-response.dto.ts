import { createZodDto } from 'nestjs-zod';

import { SongSelectResponseSchema } from './song-select-response.schema';

export class SongSelectResponseDto extends createZodDto(SongSelectResponseSchema) {}
