import { createZodDto } from 'nestjs-zod';

import { RejectTabSchema } from './reject-tab.schema';

export class RejectTabDto extends createZodDto(RejectTabSchema) {}
