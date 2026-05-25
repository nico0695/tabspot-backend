import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { Genre } from '@src/generated/prisma/client';

import { slugify } from '@common/utils/slugify';
import { GenreRepository } from '@modules/genres/repositories/genre.repository';

import type { CreateGenreInput } from '../dto/requests/create-genre.schema';
import type { ListAdminGenresParams } from '../dto/queries/list-admin-genres.schema';
import type { UpdateGenreInput } from '../dto/requests/update-genre.schema';
import type { PaginatedResult } from '../../shared/pagination.types';

@Injectable()
export class AdminGenresService {
  constructor(private readonly genreRepository: GenreRepository) {}

  async createGenre(input: CreateGenreInput): Promise<Genre> {
    const slug = slugify(input.name);
    const existing = await this.genreRepository.findBySlug(slug);

    if (existing) {
      throw new ConflictException({
        code: 'GENRE_SLUG_CONFLICT',
        message: `A genre with slug "${slug}" already exists`,
      });
    }

    return this.genreRepository.create({ name: input.name, slug });
  }

  async listGenres(params: ListAdminGenresParams): Promise<PaginatedResult<Genre>> {
    const { items, totalCount } = await this.genreRepository.listOffset(params);

    return {
      data: items,
      pageInfo: {
        page: params.page,
        pageSize: params.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / params.pageSize),
      },
    };
  }

  async getGenre(id: string): Promise<Genre> {
    const genre = await this.genreRepository.findById(id);

    if (!genre) {
      throw new NotFoundException({ code: 'GENRE_NOT_FOUND', message: 'Genre not found' });
    }

    return genre;
  }

  async updateGenre(id: string, input: UpdateGenreInput): Promise<Genre> {
    const genre = await this.genreRepository.findById(id);

    if (!genre) {
      throw new NotFoundException({ code: 'GENRE_NOT_FOUND', message: 'Genre not found' });
    }

    const data: { name?: string; slug?: string } = {};

    if (input.name !== undefined) {
      data.name = input.name;
      const slug = slugify(input.name);
      const conflict = await this.genreRepository.findBySlug(slug);

      if (conflict && conflict.id !== id) {
        throw new ConflictException({
          code: 'GENRE_SLUG_CONFLICT',
          message: `A genre with slug "${slug}" already exists`,
        });
      }

      data.slug = slug;
    }

    return this.genreRepository.update(id, data);
  }

  async deleteGenre(id: string): Promise<Genre> {
    const genre = await this.genreRepository.findById(id);

    if (!genre) {
      throw new NotFoundException({ code: 'GENRE_NOT_FOUND', message: 'Genre not found' });
    }

    const activeSongs = await this.genreRepository.countActiveSongAssociations(id);

    if (activeSongs > 0) {
      throw new ConflictException({
        code: 'GENRE_HAS_ACTIVE_SONGS',
        message: 'Cannot delete genre with active song associations',
      });
    }

    return this.genreRepository.softDelete(id);
  }
}
