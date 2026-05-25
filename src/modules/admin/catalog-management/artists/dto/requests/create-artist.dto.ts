import { createZodDto } from 'nestjs-zod';

import { CreateArtistSchema } from './create-artist.schema';

export class CreateArtistDto extends createZodDto(CreateArtistSchema) {}
