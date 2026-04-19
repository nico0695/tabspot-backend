import { createZodDto } from 'nestjs-zod';

import { SongResponseSchema } from './song-response.schema';

export class SongResponseDto extends createZodDto(SongResponseSchema) {}
