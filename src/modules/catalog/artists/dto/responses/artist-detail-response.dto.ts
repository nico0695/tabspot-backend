import { createZodDto } from 'nestjs-zod';

import { ArtistDetailResponseSchema } from './artist-detail-response.schema';

export class ArtistDetailResponseDto extends createZodDto(ArtistDetailResponseSchema) {}
