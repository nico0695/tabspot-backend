import { Injectable } from '@nestjs/common';

import type { GenreResponse } from './dto/genre-response.schema';
import { ListGenresResponse } from './dto/list-genres-response.schema';
import { ListGenresParams } from './dto/list-genres.schema';
import { GenreRepository } from './repositories/genre.repository';

@Injectable()
export class GenresService {
  constructor(private readonly genreRepository: GenreRepository) {}

  async getAllForSelect(): Promise<GenreResponse[]> {
    const genres = await this.genreRepository.findAll();
    return genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug }));
  }

  async listGenres(params: ListGenresParams): Promise<ListGenresResponse> {
    const { items, nextCursor, hasMore } = await this.genreRepository.listCursor(params);

    return {
      data: items.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
      pageInfo: { nextCursor, hasMore },
    };
  }
}
