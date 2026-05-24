import { createZodDto } from 'nestjs-zod';

import { ListArtistsResponseSchema } from './list-artists-response.schema';

export class ListArtistsResponseDto extends createZodDto(ListArtistsResponseSchema) {}
