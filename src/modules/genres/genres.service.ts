import { Injectable } from '@nestjs/common';

import { ListGenresResponse } from './dto/list-genres-response.schema';
import { ListGenresParams } from './dto/list-genres.schema';
import { GenreRepository } from './repositories/genre.repository';

@Injectable()
export class GenresService {
  constructor(private readonly genreRepository: GenreRepository) {}

  async listGenres(params: ListGenresParams): Promise<ListGenresResponse> {
    const { items, nextCursor, hasMore } = await this.genreRepository.listCursor(params);

    return {
      data: items.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
