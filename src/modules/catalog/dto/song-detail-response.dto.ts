import { createZodDto } from 'nestjs-zod';

import { SongDetailResponseSchema } from './song-detail-response.schema';

export class SongDetailResponseDto extends createZodDto(SongDetailResponseSchema) {}
