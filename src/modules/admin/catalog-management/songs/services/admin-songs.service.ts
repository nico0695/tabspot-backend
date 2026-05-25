import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '@src/prisma/prisma.service';

import { slugify } from '@common/utils/slugify';
import { ArtistRepository } from '@modules/catalog/repositories/artist.repository';
import { SongRepository } from '@modules/catalog/repositories/song.repository';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import { SongGenreRepository } from '@modules/catalog/repositories/song-genre.repository';
import { GenreRepository } from '@modules/genres/repositories/genre.repository';

import type { CreateSongInput } from '../dto/requests/create-song.schema';
import type { ListAdminSongsParams } from '../dto/queries/list-admin-songs.schema';
import type { UpdateSongInput } from '../dto/requests/update-song.schema';
import type { PaginatedResult } from '../../shared/pagination.types';

@Injectable()
export class AdminSongsService {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly songRepository: SongRepository,
    private readonly songGenreRepository: SongGenreRepository,
    private readonly genreRepository: GenreRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createSong(input: CreateSongInput): Promise<SongWithArtistAndGenres> {
    const artist = await this.artistRepository.findById(input.artistId);

    if (!artist || artist.deletedAt !== null) {
      throw new UnprocessableEntityException({
        code: 'ARTIST_NOT_FOUND',
        message: 'Artist not found or has been deleted',
      });
    }

    const slug = slugify(input.title);
    const conflict = await this.songRepository.findByArtistAndSlug(input.artistId, slug);

    if (conflict) {
      throw new ConflictException({
        code: 'SONG_SLUG_CONFLICT',
        message: `A song with slug "${slug}" already exists for this artist`,
      });
    }

    if (input.genreIds && input.genreIds.length > 0) {
      const foundGenres = await this.genreRepository.findByIds(input.genreIds);

      if (foundGenres.length !== input.genreIds.length) {
        throw new UnprocessableEntityException({
          code: 'INVALID_GENRE_IDS',
          message: 'One or more genre IDs are invalid',
        });
      }
    }

    const song = await this.prisma.$transaction(async (tx) => {
      const created = await tx.song.create({
        data: {
          artistId: input.artistId,
          title: input.title,
          slug,
          subtitle: input.subtitle,
          releaseYear: input.releaseYear,
        },
      });

      if (input.genreIds && input.genreIds.length > 0) {
        await tx.songGenre.createMany({
          data: input.genreIds.map((genreId: string) => ({ songId: created.id, genreId })),
        });
      }

      return created;
    });

    const result = await this.songRepository.findById(song.id);
    return result!;
  }

  async listSongs(params: ListAdminSongsParams): Promise<PaginatedResult<SongWithArtistAndGenres>> {
    const { items, totalCount } = await this.songRepository.listOffset(params);

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

  async getSong(id: string): Promise<SongWithArtistAndGenres> {
    const song = await this.songRepository.findById(id);

    if (!song) {
      throw new NotFoundException({ code: 'SONG_NOT_FOUND', message: 'Song not found' });
    }

    return song;
  }

  async updateSong(id: string, input: UpdateSongInput): Promise<SongWithArtistAndGenres> {
    const song = await this.songRepository.findById(id);

    if (!song) {
      throw new NotFoundException({ code: 'SONG_NOT_FOUND', message: 'Song not found' });
    }

    const data: {
      title?: string;
      slug?: string;
      subtitle?: string | null;
      releaseYear?: number | null;
    } = {};

    if (input.title !== undefined) {
      data.title = input.title;
      const slug = slugify(input.title);
      const conflict = await this.songRepository.findByArtistAndSlug(song.artistId, slug);

      if (conflict && conflict.id !== id) {
        throw new ConflictException({
          code: 'SONG_SLUG_CONFLICT',
          message: `A song with slug "${slug}" already exists for this artist`,
        });
      }

      data.slug = slug;
    }

    if (input.subtitle !== undefined) {
      data.subtitle = input.subtitle;
    }

    if (input.releaseYear !== undefined) {
      data.releaseYear = input.releaseYear;
    }

    if (input.genreIds !== undefined) {
      const foundGenres = await this.genreRepository.findByIds(input.genreIds);

      if (foundGenres.length !== input.genreIds.length) {
        throw new UnprocessableEntityException({
          code: 'INVALID_GENRE_IDS',
          message: 'One or more genre IDs are invalid',
        });
      }

      await this.songGenreRepository.replaceForSong(id, input.genreIds);
    }

    await this.songRepository.update(id, data);

    const result = await this.songRepository.findById(id);
    return result!;
  }

  async deleteSong(id: string): Promise<SongWithArtistAndGenres> {
    const song = await this.songRepository.findById(id);

    if (!song) {
      throw new NotFoundException({ code: 'SONG_NOT_FOUND', message: 'Song not found' });
    }

    const publishedTabs = await this.songRepository.countPublishedTabs(id);

    if (publishedTabs > 0) {
      throw new ConflictException({
        code: 'SONG_HAS_PUBLISHED_TABS',
        message: 'Cannot delete song with published tabs',
      });
    }

    await this.songRepository.softDelete(id);

    return song;
  }
}
