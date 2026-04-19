import { Injectable } from '@nestjs/common';

import { ListArtistsResponse } from './dto/list-artists-response.schema';
import { ListArtistsParams } from './dto/list-artists.schema';
import { ArtistRepository } from './repositories/artist.repository';

@Injectable()
export class ArtistService {
  constructor(private readonly artistRepository: ArtistRepository) {}

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
}
