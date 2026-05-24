import { Module } from '@nestjs/common';

import { TabsModule } from '@modules/tabs/tabs.module';

import { ArtistService } from './artists/artist.service';
import { ArtistsPublicController } from './artists/artists-public.controller';
import { ArtistRepository } from './repositories/artist.repository';
import { SongGenreRepository } from './repositories/song-genre.repository';
import { SongRepository } from './repositories/song.repository';
import { SongService } from './songs/song.service';
import { SongsPublicController } from './songs/songs-public.controller';

@Module({
  imports: [TabsModule],
  controllers: [ArtistsPublicController, SongsPublicController],
  providers: [ArtistService, SongService, ArtistRepository, SongRepository, SongGenreRepository],
  exports: [ArtistService, SongService, ArtistRepository, SongRepository, SongGenreRepository],
})
export class CatalogModule {}
