import { createZodDto } from 'nestjs-zod';

import { ListSongsSchema } from './list-songs.schema';

export class ListSongsDto extends createZodDto(ListSongsSchema) {}
