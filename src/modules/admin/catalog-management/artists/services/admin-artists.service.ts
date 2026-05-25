import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { Artist } from '@src/generated/prisma/client';

import { slugify } from '@common/utils/slugify';
import { ArtistRepository } from '@modules/catalog/repositories/artist.repository';

import type { CreateArtistInput } from '../dto/requests/create-artist.schema';
import type { ListAdminArtistsParams } from '../dto/queries/list-admin-artists.schema';
import type { UpdateArtistInput } from '../dto/requests/update-artist.schema';
import type { PaginatedResult } from '../../shared/pagination.types';

@Injectable()
export class AdminArtistsService {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async createArtist(input: CreateArtistInput): Promise<Artist> {
    const slug = slugify(input.name);
    const existing = await this.artistRepository.findBySlug(slug);

    if (existing) {
      throw new ConflictException({
        code: 'ARTIST_SLUG_CONFLICT',
        message: `An artist with slug "${slug}" already exists`,
      });
    }

    return this.artistRepository.create({
      name: input.name,
      slug,
      sortName: input.sortName,
    });
  }

  async listArtists(params: ListAdminArtistsParams): Promise<PaginatedResult<Artist>> {
    const { items, totalCount } = await this.artistRepository.listOffset(params);

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

  async getArtist(id: string): Promise<Artist> {
    const artist = await this.artistRepository.findById(id);

    if (!artist) {
      throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
    }

    return artist;
  }

  async updateArtist(id: string, input: UpdateArtistInput): Promise<Artist> {
    const artist = await this.artistRepository.findById(id);

    if (!artist) {
      throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
    }

    const data: { name?: string; slug?: string; sortName?: string | null } = {};

    if (input.name !== undefined) {
      data.name = input.name;
      const slug = slugify(input.name);
      const conflict = await this.artistRepository.findBySlug(slug);

      if (conflict && conflict.id !== id) {
        throw new ConflictException({
          code: 'ARTIST_SLUG_CONFLICT',
          message: `An artist with slug "${slug}" already exists`,
        });
      }

      data.slug = slug;
    }

    if (input.sortName !== undefined) {
      data.sortName = input.sortName;
    }

    return this.artistRepository.update(id, data);
  }

  async deleteArtist(id: string): Promise<Artist> {
    const artist = await this.artistRepository.findById(id);

    if (!artist) {
      throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artist not found' });
    }

    const activeSongs = await this.artistRepository.countActiveSongs(id);

    if (activeSongs > 0) {
      throw new ConflictException({
        code: 'ARTIST_HAS_ACTIVE_SONGS',
        message: 'Cannot delete artist with active songs',
      });
    }

    return this.artistRepository.softDelete(id);
  }
}
