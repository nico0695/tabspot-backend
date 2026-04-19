import { Module } from '@nestjs/common';

import { ArtistService } from './artist.service';
import { ArtistsPublicController } from './artists-public.controller';
import { ArtistRepository } from './repositories/artist.repository';
import { SongRepository } from './repositories/song.repository';
import { SongService } from './song.service';
import { SongsPublicController } from './songs-public.controller';

@Module({
  controllers: [ArtistsPublicController, SongsPublicController],
  providers: [ArtistService, SongService, ArtistRepository, SongRepository],
  exports: [ArtistService, SongService],
})
export class CatalogModule {}
