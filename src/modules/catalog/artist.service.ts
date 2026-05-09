import { Injectable, NotFoundException } from '@nestjs/common';

import type { ArtistDetailResponse } from './dto/artist-detail-response.schema';
import { ListArtistsResponse } from './dto/list-artists-response.schema';
import { ListArtistsParams } from './dto/list-artists.schema';
import { ArtistRepository } from './repositories/artist.repository';
import { SongRepository } from './repositories/song.repository';

@Injectable()
export class ArtistService {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly songRepository: SongRepository,
  ) {}

  async listArtists(params: ListArtistsParams): Promise<ListArtistsResponse> {
    const { items, nextCursor, hasMore } = await this.artistRepository.listCursor(params);

    return {
      data: items.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        sortName: a.sortName,
      })),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async getArtistBySlug(slug: string): Promise<ArtistDetailResponse> {
    const artist = await this.artistRepository.findBySlug(slug);

    if (!artist) {
      throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
    }

    const songs = await this.songRepository.listByArtist(artist.id);

    const songsWithTabCount = await Promise.all(
      songs.map(async (s) => {
        const publishedTabCount = await this.songRepository.countPublishedTabs(s.id);
        return {
          id: s.id,
          title: s.title,
          slug: s.slug,
          subtitle: s.subtitle,
          releaseYear: s.releaseYear,
          publishedTabCount,
        };
      }),
    );

    return {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      sortName: artist.sortName,
      songs: songsWithTabCount,
    };
  }
}
