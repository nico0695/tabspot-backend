import { createZodDto } from 'nestjs-zod';

import { TabDetailSchema } from './tab-detail.schema';

export class TabDetailDto extends createZodDto(TabDetailSchema) {}
