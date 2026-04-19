import { createZodDto } from 'nestjs-zod';

import { ArtistResponseSchema } from './artist-response.schema';

export class ArtistResponseDto extends createZodDto(ArtistResponseSchema) {}
