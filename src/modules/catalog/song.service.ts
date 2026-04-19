import { Injectable } from '@nestjs/common';

import { ListSongsResponse } from './dto/list-songs-response.schema';
import { ListSongsParams } from './dto/list-songs.schema';
import { SongRepository } from './repositories/song.repository';

@Injectable()
export class SongService {
  constructor(private readonly songRepository: SongRepository) {}

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
}
