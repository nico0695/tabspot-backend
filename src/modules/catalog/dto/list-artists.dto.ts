import { createZodDto } from 'nestjs-zod';

import { ListArtistsSchema } from './list-artists.schema';

export class ListArtistsDto extends createZodDto(ListArtistsSchema) {}
