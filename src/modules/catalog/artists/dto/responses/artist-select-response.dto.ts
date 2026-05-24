import { createZodDto } from 'nestjs-zod';

import { ArtistSelectResponseSchema } from './artist-select-response.schema';

export class ArtistSelectResponseDto extends createZodDto(ArtistSelectResponseSchema) {}
