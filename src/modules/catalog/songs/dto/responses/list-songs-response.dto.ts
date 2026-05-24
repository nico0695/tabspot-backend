import { createZodDto } from 'nestjs-zod';

import { ListSongsResponseSchema } from './list-songs-response.schema';

export class ListSongsResponseDto extends createZodDto(ListSongsResponseSchema) {}
