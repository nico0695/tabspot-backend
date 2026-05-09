import { createZodDto } from 'nestjs-zod';

import { ListAdminArtistsSchema } from './list-admin-artists.schema';

export class ListAdminArtistsDto extends createZodDto(ListAdminArtistsSchema) {}
