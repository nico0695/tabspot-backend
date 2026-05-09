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

import type { Song } from '@src/generated/prisma/client';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';

import { AdminSongsController } from '../admin-songs.controller';
import type { AdminCatalogService, PaginatedResult } from '../../services/admin-catalog.service';

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

describe('AdminSongsController', (): void => {
  let createSong: jest.Mock;
  let listSongs: jest.Mock;
  let getSong: jest.Mock;
  let updateSong: jest.Mock;
  let deleteSong: jest.Mock;
  let controller: AdminSongsController;

  beforeEach((): void => {
    createSong = jest.fn();
    listSongs = jest.fn();
    getSong = jest.fn();
    updateSong = jest.fn();
    deleteSong = jest.fn();

    const adminCatalogService = {
      createSong,
      listSongs,
      getSong,
      updateSong,
      deleteSong,
    } as unknown as AdminCatalogService;

    controller = new AdminSongsController(adminCatalogService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', (): void => {
    it('delegates to adminCatalogService.createSong', async (): Promise<void> => {
      const song = makeSong();
      createSong.mockResolvedValue(song);

      const body = { artistId: 'artist-1', title: 'Stairway to Heaven', genreIds: ['genre-1'] };
      const result = await controller.create(body);

      expect(createSong).toHaveBeenCalledWith(body);
      expect(result).toBe(song);
    });
  });

  // ── list ───────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('delegates to adminCatalogService.listSongs', async (): Promise<void> => {
      const song = makeSong();
      const paginated: PaginatedResult<SongWithArtistAndGenres> = {
        data: [song],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      };
      listSongs.mockResolvedValue(paginated);

      const query = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await controller.list(query);

      expect(listSongs).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', (): void => {
    it('delegates to adminCatalogService.getSong', async (): Promise<void> => {
      const song = makeSong();
      getSong.mockResolvedValue(song);

      const result = await controller.getById('song-1');

      expect(getSong).toHaveBeenCalledWith('song-1');
      expect(result).toBe(song);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', (): void => {
    it('delegates to adminCatalogService.updateSong', async (): Promise<void> => {
      const updated = makeSong({ title: 'New Title', slug: 'new-title' });
      updateSong.mockResolvedValue(updated);

      const body = { title: 'New Title', genreIds: ['genre-1'] };
      const result = await controller.update('song-1', body);

      expect(updateSong).toHaveBeenCalledWith('song-1', body);
      expect(result).toBe(updated);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', (): void => {
    it('delegates to adminCatalogService.deleteSong', async (): Promise<void> => {
      deleteSong.mockResolvedValue(makeSong());

      await controller.remove('song-1');

      expect(deleteSong).toHaveBeenCalledWith('song-1');
    });
  });
});
