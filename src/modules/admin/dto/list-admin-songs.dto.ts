import { createZodDto } from 'nestjs-zod';

import { ListAdminSongsSchema } from './list-admin-songs.schema';

export class ListAdminSongsDto extends createZodDto(ListAdminSongsSchema) {}
