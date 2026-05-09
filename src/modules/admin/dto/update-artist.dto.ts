import { createZodDto } from 'nestjs-zod';

import { UpdateArtistSchema } from './update-artist.schema';

export class UpdateArtistDto extends createZodDto(UpdateArtistSchema) {}
