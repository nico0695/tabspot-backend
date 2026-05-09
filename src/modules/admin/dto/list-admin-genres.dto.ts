import { createZodDto } from 'nestjs-zod';

import { ListAdminGenresSchema } from './list-admin-genres.schema';

export class ListAdminGenresDto extends createZodDto(ListAdminGenresSchema) {}
