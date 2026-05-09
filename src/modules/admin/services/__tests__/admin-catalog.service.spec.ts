jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../../dist/generated/prisma/client');
});
jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.js');
  },
  { virtual: true },
);
jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js');
  },
  { virtual: true },
);

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import type { Artist, Genre, Song } from '@src/generated/prisma/client';

import { AdminCatalogService } from '../admin-catalog.service';
import type { ArtistRepository } from '@modules/catalog/repositories/artist.repository';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import type { SongRepository } from '@modules/catalog/repositories/song.repository';
import type { SongGenreRepository } from '@modules/catalog/repositories/song-genre.repository';
import type { GenreRepository } from '@modules/genres/repositories/genre.repository';
import type { PrismaService } from '@src/prisma/prisma.service';

// ── Factories ──────────────────────────────────────────────────────────────

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 'artist-1',
    name: 'Led Zeppelin',
    slug: 'led-zeppelin',
    sortName: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Artist;
}

function makeGenre(overrides: Partial<Genre> = {}): Genre {
  return {
    id: 'genre-1',
    name: 'Rock',
    slug: 'rock',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Genre;
}

function makeSong(overrides: Partial<Song> = {}): SongWithArtistAndGenres {
  return {
    id: 'song-1',
    artistId: 'artist-1',
    title: 'Stairway to Heaven',
    slug: 'stairway-to-heaven',
    subtitle: null,
    releaseYear: 1971,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    artist: { id: 'artist-1', name: 'Led Zeppelin' },
    songGenres: [{ genre: { id: 'genre-1', name: 'Rock', slug: 'rock' } }],
    ...overrides,
  } as SongWithArtistAndGenres;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('AdminCatalogService', (): void => {
  let findBySlugArtist: jest.Mock;
  let createArtist: jest.Mock;
  let listOffsetArtist: jest.Mock;
  let findByIdArtist: jest.Mock;
  let updateArtist: jest.Mock;
  let softDeleteArtist: jest.Mock;
  let countActiveSongs: jest.Mock;

  let findBySlugGenre: jest.Mock;
  let createGenre: jest.Mock;
  let listOffsetGenre: jest.Mock;
  let findByIdGenre: jest.Mock;
  let updateGenre: jest.Mock;
  let softDeleteGenre: jest.Mock;
  let countActiveSongAssociations: jest.Mock;
  let findByIdsGenre: jest.Mock;

  let findByIdSong: jest.Mock;
  let findByArtistAndSlug: jest.Mock;
  let listOffsetSong: jest.Mock;
  let updateSong: jest.Mock;
  let softDeleteSong: jest.Mock;
  let countPublishedTabs: jest.Mock;

  let replaceForSong: jest.Mock;

  let $transaction: jest.Mock;

  let service: AdminCatalogService;

  beforeEach((): void => {
    // Artist repo mocks
    findBySlugArtist = jest.fn();
    createArtist = jest.fn();
    listOffsetArtist = jest.fn();
    findByIdArtist = jest.fn();
    updateArtist = jest.fn();
    softDeleteArtist = jest.fn();
    countActiveSongs = jest.fn();

    // Genre repo mocks
    findBySlugGenre = jest.fn();
    createGenre = jest.fn();
    listOffsetGenre = jest.fn();
    findByIdGenre = jest.fn();
    updateGenre = jest.fn();
    softDeleteGenre = jest.fn();
    countActiveSongAssociations = jest.fn();
    findByIdsGenre = jest.fn();

    // Song repo mocks
    findByIdSong = jest.fn();
    findByArtistAndSlug = jest.fn();
    listOffsetSong = jest.fn();
    updateSong = jest.fn();
    softDeleteSong = jest.fn();
    countPublishedTabs = jest.fn();

    // SongGenre repo mocks
    replaceForSong = jest.fn();

    // Prisma mocks
    $transaction = jest.fn();

    const mockArtistRepo = {
      findBySlug: findBySlugArtist,
      create: createArtist,
      listOffset: listOffsetArtist,
      findById: findByIdArtist,
      update: updateArtist,
      softDelete: softDeleteArtist,
      countActiveSongs,
    } as unknown as ArtistRepository;

    const mockSongRepo = {
      findById: findByIdSong,
      findByArtistAndSlug,
      listOffset: listOffsetSong,
      update: updateSong,
      softDelete: softDeleteSong,
      countPublishedTabs,
    } as unknown as SongRepository;

    const mockSongGenreRepo = {
      replaceForSong,
    } as unknown as SongGenreRepository;

    const mockGenreRepo = {
      findBySlug: findBySlugGenre,
      create: createGenre,
      listOffset: listOffsetGenre,
      findById: findByIdGenre,
      update: updateGenre,
      softDelete: softDeleteGenre,
      countActiveSongAssociations,
      findByIds: findByIdsGenre,
    } as unknown as GenreRepository;

    const mockPrisma = {
      $transaction,
    } as unknown as PrismaService;

    service = new AdminCatalogService(
      mockArtistRepo,
      mockSongRepo,
      mockSongGenreRepo,
      mockGenreRepo,
      mockPrisma,
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Artists ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  describe('createArtist', (): void => {
    it('creates artist with auto-generated slug', async (): Promise<void> => {
      findBySlugArtist.mockResolvedValue(null);
      const artist = makeArtist();
      createArtist.mockResolvedValue(artist);

      const result = await service.createArtist({ name: 'Led Zeppelin' });

      expect(findBySlugArtist).toHaveBeenCalledWith('led-zeppelin');
      expect(createArtist).toHaveBeenCalledWith({
        name: 'Led Zeppelin',
        slug: 'led-zeppelin',
        sortName: undefined,
      });
      expect(result).toBe(artist);
    });

    it('throws ConflictException with ARTIST_SLUG_CONFLICT on slug collision', async (): Promise<void> => {
      findBySlugArtist.mockResolvedValue(makeArtist());

      await expect(service.createArtist({ name: 'Led Zeppelin' })).rejects.toThrow(
        ConflictException,
      );
      expect(createArtist).not.toHaveBeenCalled();
    });
  });

  describe('listArtists', (): void => {
    it('delegates to repo and returns { data, pageInfo }', async (): Promise<void> => {
      const artist = makeArtist();
      listOffsetArtist.mockResolvedValue({ items: [artist], totalCount: 1 });

      const params = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await service.listArtists(params);

      expect(listOffsetArtist).toHaveBeenCalledWith(params);
      expect(result).toEqual({
        data: [artist],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      });
    });
  });

  describe('getArtist', (): void => {
    it('returns artist on happy path', async (): Promise<void> => {
      const artist = makeArtist();
      findByIdArtist.mockResolvedValue(artist);

      const result = await service.getArtist('artist-1');

      expect(findByIdArtist).toHaveBeenCalledWith('artist-1');
      expect(result).toBe(artist);
    });

    it('throws NotFoundException with ARTIST_NOT_FOUND when missing', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(null);

      await expect(service.getArtist('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateArtist', (): void => {
    it('re-generates slug when name changes', async (): Promise<void> => {
      const artist = makeArtist();
      findByIdArtist.mockResolvedValue(artist);
      findBySlugArtist.mockResolvedValue(null);
      const updated = makeArtist({ name: 'Pink Floyd', slug: 'pink-floyd' });
      updateArtist.mockResolvedValue(updated);

      const result = await service.updateArtist('artist-1', { name: 'Pink Floyd' });

      expect(findBySlugArtist).toHaveBeenCalledWith('pink-floyd');
      expect(updateArtist).toHaveBeenCalledWith('artist-1', {
        name: 'Pink Floyd',
        slug: 'pink-floyd',
      });
      expect(result).toBe(updated);
    });

    it('throws ConflictException on slug conflict excluding self', async (): Promise<void> => {
      const artist = makeArtist();
      findByIdArtist.mockResolvedValue(artist);
      findBySlugArtist.mockResolvedValue(makeArtist({ id: 'other-artist' }));

      await expect(service.updateArtist('artist-1', { name: 'Led Zeppelin' })).rejects.toThrow(
        ConflictException,
      );
      expect(updateArtist).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when artist not found', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(null);

      await expect(service.updateArtist('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteArtist', (): void => {
    it('soft-deletes artist on happy path', async (): Promise<void> => {
      const artist = makeArtist();
      findByIdArtist.mockResolvedValue(artist);
      countActiveSongs.mockResolvedValue(0);
      softDeleteArtist.mockResolvedValue(artist);

      const result = await service.deleteArtist('artist-1');

      expect(countActiveSongs).toHaveBeenCalledWith('artist-1');
      expect(softDeleteArtist).toHaveBeenCalledWith('artist-1');
      expect(result).toBe(artist);
    });

    it('throws ConflictException with ARTIST_HAS_ACTIVE_SONGS when songs exist', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(makeArtist());
      countActiveSongs.mockResolvedValue(3);

      await expect(service.deleteArtist('artist-1')).rejects.toThrow(ConflictException);
      expect(softDeleteArtist).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when artist not found', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(null);

      await expect(service.deleteArtist('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Genres ───────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  describe('createGenre', (): void => {
    it('creates genre with auto-generated slug', async (): Promise<void> => {
      findBySlugGenre.mockResolvedValue(null);
      const genre = makeGenre();
      createGenre.mockResolvedValue(genre);

      const result = await service.createGenre({ name: 'Rock' });

      expect(findBySlugGenre).toHaveBeenCalledWith('rock');
      expect(createGenre).toHaveBeenCalledWith({ name: 'Rock', slug: 'rock' });
      expect(result).toBe(genre);
    });

    it('throws ConflictException with GENRE_SLUG_CONFLICT on slug collision', async (): Promise<void> => {
      findBySlugGenre.mockResolvedValue(makeGenre());

      await expect(service.createGenre({ name: 'Rock' })).rejects.toThrow(ConflictException);
      expect(createGenre).not.toHaveBeenCalled();
    });
  });

  describe('listGenres', (): void => {
    it('delegates to repo and returns { data, pageInfo }', async (): Promise<void> => {
      const genre = makeGenre();
      listOffsetGenre.mockResolvedValue({ items: [genre], totalCount: 1 });

      const params = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await service.listGenres(params);

      expect(listOffsetGenre).toHaveBeenCalledWith(params);
      expect(result).toEqual({
        data: [genre],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      });
    });
  });

  describe('getGenre', (): void => {
    it('returns genre on happy path', async (): Promise<void> => {
      const genre = makeGenre();
      findByIdGenre.mockResolvedValue(genre);

      const result = await service.getGenre('genre-1');

      expect(findByIdGenre).toHaveBeenCalledWith('genre-1');
      expect(result).toBe(genre);
    });

    it('throws NotFoundException with GENRE_NOT_FOUND when missing', async (): Promise<void> => {
      findByIdGenre.mockResolvedValue(null);

      await expect(service.getGenre('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGenre', (): void => {
    it('re-generates slug when name changes', async (): Promise<void> => {
      const genre = makeGenre();
      findByIdGenre.mockResolvedValue(genre);
      findBySlugGenre.mockResolvedValue(null);
      const updated = makeGenre({ name: 'Jazz', slug: 'jazz' });
      updateGenre.mockResolvedValue(updated);

      const result = await service.updateGenre('genre-1', { name: 'Jazz' });

      expect(findBySlugGenre).toHaveBeenCalledWith('jazz');
      expect(updateGenre).toHaveBeenCalledWith('genre-1', { name: 'Jazz', slug: 'jazz' });
      expect(result).toBe(updated);
    });

    it('throws ConflictException on slug conflict excluding self', async (): Promise<void> => {
      const genre = makeGenre();
      findByIdGenre.mockResolvedValue(genre);
      findBySlugGenre.mockResolvedValue(makeGenre({ id: 'other-genre' }));

      await expect(service.updateGenre('genre-1', { name: 'Rock' })).rejects.toThrow(
        ConflictException,
      );
      expect(updateGenre).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when genre not found', async (): Promise<void> => {
      findByIdGenre.mockResolvedValue(null);

      await expect(service.updateGenre('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteGenre', (): void => {
    it('soft-deletes genre on happy path', async (): Promise<void> => {
      const genre = makeGenre();
      findByIdGenre.mockResolvedValue(genre);
      countActiveSongAssociations.mockResolvedValue(0);
      softDeleteGenre.mockResolvedValue(genre);

      const result = await service.deleteGenre('genre-1');

      expect(countActiveSongAssociations).toHaveBeenCalledWith('genre-1');
      expect(softDeleteGenre).toHaveBeenCalledWith('genre-1');
      expect(result).toBe(genre);
    });

    it('throws ConflictException with GENRE_HAS_ACTIVE_SONGS when associations exist', async (): Promise<void> => {
      findByIdGenre.mockResolvedValue(makeGenre());
      countActiveSongAssociations.mockResolvedValue(5);

      await expect(service.deleteGenre('genre-1')).rejects.toThrow(ConflictException);
      expect(softDeleteGenre).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when genre not found', async (): Promise<void> => {
      findByIdGenre.mockResolvedValue(null);

      await expect(service.deleteGenre('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Songs ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  describe('createSong', (): void => {
    it('creates song with genreIds on happy path', async (): Promise<void> => {
      const artist = makeArtist();
      findByIdArtist.mockResolvedValue(artist);
      findByArtistAndSlug.mockResolvedValue(null);
      findByIdsGenre.mockResolvedValue([makeGenre()]);

      const createdSong = { id: 'song-1' };
      $transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => {
          const tx = {
            song: {
              create: jest.fn().mockResolvedValue(createdSong),
            },
            songGenre: {
              createMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(tx);
        },
      );

      const songResult = makeSong();
      findByIdSong.mockResolvedValue(songResult);

      const result = await service.createSong({
        artistId: 'artist-1',
        title: 'Stairway to Heaven',
        genreIds: ['genre-1'],
      });

      expect(findByIdArtist).toHaveBeenCalledWith('artist-1');
      expect(findByArtistAndSlug).toHaveBeenCalledWith('artist-1', 'stairway-to-heaven');
      expect(findByIdsGenre).toHaveBeenCalledWith(['genre-1']);
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(findByIdSong).toHaveBeenCalledWith('song-1');
      expect(result).toBe(songResult);
    });

    it('throws UnprocessableEntityException with ARTIST_NOT_FOUND when artist missing', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(null);

      await expect(service.createSong({ artistId: 'missing', title: 'Test' })).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect($transaction).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when artist is soft-deleted', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(makeArtist({ deletedAt: new Date() }));

      await expect(service.createSong({ artistId: 'artist-1', title: 'Test' })).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect($transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException with SONG_SLUG_CONFLICT on slug collision', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(makeArtist());
      findByArtistAndSlug.mockResolvedValue(makeSong());

      await expect(
        service.createSong({ artistId: 'artist-1', title: 'Stairway to Heaven' }),
      ).rejects.toThrow(ConflictException);
      expect($transaction).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException with INVALID_GENRE_IDS when genres not found', async (): Promise<void> => {
      findByIdArtist.mockResolvedValue(makeArtist());
      findByArtistAndSlug.mockResolvedValue(null);
      findByIdsGenre.mockResolvedValue([]);

      await expect(
        service.createSong({
          artistId: 'artist-1',
          title: 'Test Song',
          genreIds: ['bad-id'],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect($transaction).not.toHaveBeenCalled();
    });
  });

  describe('listSongs', (): void => {
    it('delegates to repo and returns { data, pageInfo }', async (): Promise<void> => {
      const song = makeSong();
      listOffsetSong.mockResolvedValue({ items: [song], totalCount: 1 });

      const params = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await service.listSongs(params);

      expect(listOffsetSong).toHaveBeenCalledWith(params);
      expect(result).toEqual({
        data: [song],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      });
    });
  });

  describe('getSong', (): void => {
    it('returns song on happy path', async (): Promise<void> => {
      const song = makeSong();
      findByIdSong.mockResolvedValue(song);

      const result = await service.getSong('song-1');

      expect(findByIdSong).toHaveBeenCalledWith('song-1');
      expect(result).toBe(song);
    });

    it('throws NotFoundException with SONG_NOT_FOUND when missing', async (): Promise<void> => {
      findByIdSong.mockResolvedValue(null);

      await expect(service.getSong('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSong', (): void => {
    it('updates song with title change and genre replacement', async (): Promise<void> => {
      const song = makeSong();
      findByIdSong.mockResolvedValueOnce(song);
      findByArtistAndSlug.mockResolvedValue(null);
      findByIdsGenre.mockResolvedValue([makeGenre()]);
      replaceForSong.mockResolvedValue(undefined);
      updateSong.mockResolvedValue(song);

      const updatedSong = makeSong({ title: 'New Title', slug: 'new-title' });
      findByIdSong.mockResolvedValueOnce(updatedSong);

      const result = await service.updateSong('song-1', {
        title: 'New Title',
        genreIds: ['genre-1'],
      });

      expect(findByArtistAndSlug).toHaveBeenCalledWith('artist-1', 'new-title');
      expect(replaceForSong).toHaveBeenCalledWith('song-1', ['genre-1']);
      expect(updateSong).toHaveBeenCalledWith('song-1', {
        title: 'New Title',
        slug: 'new-title',
      });
      expect(result).toBe(updatedSong);
    });

    it('throws NotFoundException when song not found', async (): Promise<void> => {
      findByIdSong.mockResolvedValue(null);

      await expect(service.updateSong('missing', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException on slug conflict excluding self', async (): Promise<void> => {
      const song = makeSong();
      findByIdSong.mockResolvedValue(song);
      findByArtistAndSlug.mockResolvedValue(makeSong({ id: 'other-song' }));

      await expect(service.updateSong('song-1', { title: 'Stairway to Heaven' })).rejects.toThrow(
        ConflictException,
      );
      expect(updateSong).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException with INVALID_GENRE_IDS on bad genres', async (): Promise<void> => {
      const song = makeSong();
      findByIdSong.mockResolvedValue(song);
      findByIdsGenre.mockResolvedValue([]);

      await expect(service.updateSong('song-1', { genreIds: ['bad-id'] })).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(replaceForSong).not.toHaveBeenCalled();
    });
  });

  describe('deleteSong', (): void => {
    it('soft-deletes song on happy path', async (): Promise<void> => {
      const song = makeSong();
      findByIdSong.mockResolvedValue(song);
      countPublishedTabs.mockResolvedValue(0);
      softDeleteSong.mockResolvedValue(song);

      const result = await service.deleteSong('song-1');

      expect(countPublishedTabs).toHaveBeenCalledWith('song-1');
      expect(softDeleteSong).toHaveBeenCalledWith('song-1');
      expect(result).toBe(song);
    });

    it('throws ConflictException with SONG_HAS_PUBLISHED_TABS when tabs exist', async (): Promise<void> => {
      findByIdSong.mockResolvedValue(makeSong());
      countPublishedTabs.mockResolvedValue(2);

      await expect(service.deleteSong('song-1')).rejects.toThrow(ConflictException);
      expect(softDeleteSong).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when song not found', async (): Promise<void> => {
      findByIdSong.mockResolvedValue(null);

      await expect(service.deleteSong('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
