import { Module } from '@nestjs/common';

import { GenresPublicController } from './genres-public.controller';
import { GenresService } from './genres.service';
import { GenreRepository } from './repositories/genre.repository';

@Module({
  controllers: [GenresPublicController],
  providers: [GenresService, GenreRepository],
  exports: [GenresService],
})
export class GenresModule {}
