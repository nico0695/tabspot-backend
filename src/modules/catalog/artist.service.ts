import { Injectable, NotFoundException } from '@nestjs/common';

import type { ArtistDetailResponse } from './dto/artist-detail-response.schema';
import type { ArtistSelectResponse } from './dto/artist-select-response.schema';
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

  async getAllForSelect(): Promise<ArtistSelectResponse[]> {
    const artists = await this.artistRepository.findAll();
    return artists.map((a) => ({ id: a.id, name: a.name, slug: a.slug }));
  }

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
    const tabCounts = await this.songRepository.countPublishedTabsBatch(songs.map((s) => s.id));

    const songsWithTabCount = songs.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      subtitle: s.subtitle,
      releaseYear: s.releaseYear,
      publishedTabCount: tabCounts.get(s.id) ?? 0,
    }));

    return {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      sortName: artist.sortName,
      songs: songsWithTabCount,
    };
  }
}
