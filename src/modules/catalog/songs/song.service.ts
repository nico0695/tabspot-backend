import { Injectable, NotFoundException } from '@nestjs/common';

import { TabsService } from '@modules/tabs/tabs.service';
import type { FindPublishedFilters } from '@modules/tabs/ports/tab-repository.port';

import { ListSongsParams } from './dto/queries/list-songs.schema';
import { ListSongsResponse } from './dto/responses/list-songs-response.schema';
import type {
  SongDetailResponse,
  SongTabSummary,
} from './dto/responses/song-detail-response.schema';
import type { SongSelectResponse } from './dto/responses/song-select-response.schema';
import { SongRepository } from '../repositories/song.repository';

@Injectable()
export class SongService {
  constructor(
    private readonly songRepository: SongRepository,
    private readonly tabsService: TabsService,
  ) {}

  async getAllForSelect(): Promise<SongSelectResponse[]> {
    const songs = await this.songRepository.findAll();
    return songs.map((song) => ({ id: song.id, title: song.title }));
  }

  async listSongs(params: ListSongsParams): Promise<ListSongsResponse> {
    const { items, nextCursor, hasMore } = await this.songRepository.listCursor(params);

    return {
      data: items.map((s) => ({
        id: s.id,
        artistId: s.artistId,
        title: s.title,
        slug: s.slug,
        subtitle: s.subtitle,
        releaseYear: s.releaseYear,
      })),
      pageInfo: { nextCursor, hasMore },
    };
  }

  async getSongBySlug(slug: string, tabFilters: FindPublishedFilters): Promise<SongDetailResponse> {
    const song = await this.songRepository.findBySlug(slug);

    if (!song) {
      throw new NotFoundException({ code: 'SONG_NOT_FOUND', message: 'Song not found' });
    }

    const publishedTabs = await this.tabsService.listPublished({
      ...tabFilters,
      songId: song.id,
    });

    const tabData: SongTabSummary[] = publishedTabs.items.map((t) => ({
      id: t.id,
      titleOverride: t.titleOverride,
      tabType: t.tabType,
      instrument: t.instrument,
      difficulty: t.difficulty,
      authorDisplayName: t.author.displayName,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      id: song.id,
      artistId: song.artistId,
      title: song.title,
      slug: song.slug,
      subtitle: song.subtitle,
      releaseYear: song.releaseYear,
      artist: {
        id: song.artist.id,
        name: song.artist.name,
        slug: song.artist.slug,
      },
      genres: song.songGenres.map((sg) => ({
        id: sg.genre.id,
        name: sg.genre.name,
        slug: sg.genre.slug,
      })),
      tabs: {
        data: tabData,
        pageInfo: {
          nextCursor: publishedTabs.nextCursor,
          hasMore: publishedTabs.hasMore,
        },
      },
    };
  }
}
