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

import type { Genre } from '@src/generated/prisma/client';

import { AdminGenresController } from '../admin-genres.controller';
import type { AdminCatalogService, PaginatedResult } from '../../services/admin-catalog.service';

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

describe('AdminGenresController', (): void => {
  let createGenre: jest.Mock;
  let listGenres: jest.Mock;
  let getGenre: jest.Mock;
  let updateGenre: jest.Mock;
  let deleteGenre: jest.Mock;
  let controller: AdminGenresController;

  beforeEach((): void => {
    createGenre = jest.fn();
    listGenres = jest.fn();
    getGenre = jest.fn();
    updateGenre = jest.fn();
    deleteGenre = jest.fn();

    const adminCatalogService = {
      createGenre,
      listGenres,
      getGenre,
      updateGenre,
      deleteGenre,
    } as unknown as AdminCatalogService;

    controller = new AdminGenresController(adminCatalogService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', (): void => {
    it('delegates to adminCatalogService.createGenre', async (): Promise<void> => {
      const genre = makeGenre();
      createGenre.mockResolvedValue(genre);

      const body = { name: 'Rock' };
      const result = await controller.create(body);

      expect(createGenre).toHaveBeenCalledWith(body);
      expect(result).toBe(genre);
    });
  });

  // ── list ───────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('delegates to adminCatalogService.listGenres', async (): Promise<void> => {
      const genre = makeGenre();
      const paginated: PaginatedResult<Genre> = {
        data: [genre],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      };
      listGenres.mockResolvedValue(paginated);

      const query = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await controller.list(query);

      expect(listGenres).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', (): void => {
    it('delegates to adminCatalogService.getGenre', async (): Promise<void> => {
      const genre = makeGenre();
      getGenre.mockResolvedValue(genre);

      const result = await controller.getById('genre-1');

      expect(getGenre).toHaveBeenCalledWith('genre-1');
      expect(result).toBe(genre);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', (): void => {
    it('delegates to adminCatalogService.updateGenre', async (): Promise<void> => {
      const updated = makeGenre({ name: 'Jazz', slug: 'jazz' });
      updateGenre.mockResolvedValue(updated);

      const body = { name: 'Jazz' };
      const result = await controller.update('genre-1', body);

      expect(updateGenre).toHaveBeenCalledWith('genre-1', body);
      expect(result).toBe(updated);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', (): void => {
    it('delegates to adminCatalogService.deleteGenre', async (): Promise<void> => {
      deleteGenre.mockResolvedValue(makeGenre());

      await controller.remove('genre-1');

      expect(deleteGenre).toHaveBeenCalledWith('genre-1');
    });
  });
});
