import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { Artist, Genre } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

import { slugify } from '@common/utils/slugify';
import { ArtistRepository } from '@modules/catalog/repositories/artist.repository';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import { SongRepository } from '@modules/catalog/repositories/song.repository';
import { SongGenreRepository } from '@modules/catalog/repositories/song-genre.repository';
import { GenreRepository } from '@modules/genres/repositories/genre.repository';

import type { CreateArtistInput } from '../dto/create-artist.schema';
import type { UpdateArtistInput } from '../dto/update-artist.schema';
import type { ListAdminArtistsParams } from '../dto/list-admin-artists.schema';
import type { CreateGenreInput } from '../dto/create-genre.schema';
import type { UpdateGenreInput } from '../dto/update-genre.schema';
import type { ListAdminGenresParams } from '../dto/list-admin-genres.schema';
import type { CreateSongInput } from '../dto/create-song.schema';
import type { UpdateSongInput } from '../dto/update-song.schema';
import type { ListAdminSongsParams } from '../dto/list-admin-songs.schema';

export interface OffsetPageInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: OffsetPageInfo;
}

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly songRepository: SongRepository,
    private readonly songGenreRepository: SongGenreRepository,
    private readonly genreRepository: GenreRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Artists ──────────────────────────────────────────────────────────

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

  // ── Genres ───────────────────────────────────────────────────────────

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

  // ── Songs ────────────────────────────────────────────────────────────

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
          data: input.genreIds.map((genreId) => ({ songId: created.id, genreId })),
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
