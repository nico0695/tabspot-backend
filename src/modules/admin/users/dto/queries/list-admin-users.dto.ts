import { createZodDto } from 'nestjs-zod';

import { ListAdminUsersSchema } from './list-admin-users.schema';

export class ListAdminUsersDto extends createZodDto(ListAdminUsersSchema) {}
