import { createZodDto } from 'nestjs-zod';

import { ChangeRoleSchema } from './change-role.schema';

export class ChangeRoleDto extends createZodDto(ChangeRoleSchema) {}
