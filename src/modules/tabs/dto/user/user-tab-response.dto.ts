import { createZodDto } from 'nestjs-zod';

import { UserTabResponseSchema } from './user-tab-response.schema';

export class UserTabResponseDto extends createZodDto(UserTabResponseSchema) {}
