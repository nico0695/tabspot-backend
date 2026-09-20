import { createZodDto } from 'nestjs-zod';

import { BulkImportRequestSchema } from './bulk-import-request.schema';

export class BulkImportRequestDto extends createZodDto(BulkImportRequestSchema) {}
