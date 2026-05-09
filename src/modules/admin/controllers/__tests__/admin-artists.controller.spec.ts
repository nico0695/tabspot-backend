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

import type { Artist } from '@src/generated/prisma/client';

import { AdminArtistsController } from '../admin-artists.controller';
import type { AdminCatalogService, PaginatedResult } from '../../services/admin-catalog.service';

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

describe('AdminArtistsController', (): void => {
  let createArtist: jest.Mock;
  let listArtists: jest.Mock;
  let getArtist: jest.Mock;
  let updateArtist: jest.Mock;
  let deleteArtist: jest.Mock;
  let controller: AdminArtistsController;

  beforeEach((): void => {
    createArtist = jest.fn();
    listArtists = jest.fn();
    getArtist = jest.fn();
    updateArtist = jest.fn();
    deleteArtist = jest.fn();

    const adminCatalogService = {
      createArtist,
      listArtists,
      getArtist,
      updateArtist,
      deleteArtist,
    } as unknown as AdminCatalogService;

    controller = new AdminArtistsController(adminCatalogService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', (): void => {
    it('delegates to adminCatalogService.createArtist', async (): Promise<void> => {
      const artist = makeArtist();
      createArtist.mockResolvedValue(artist);

      const body = { name: 'Led Zeppelin' };
      const result = await controller.create(body);

      expect(createArtist).toHaveBeenCalledWith(body);
      expect(result).toBe(artist);
    });
  });

  // ── list ───────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('delegates to adminCatalogService.listArtists', async (): Promise<void> => {
      const artist = makeArtist();
      const paginated: PaginatedResult<Artist> = {
        data: [artist],
        pageInfo: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      };
      listArtists.mockResolvedValue(paginated);

      const query = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await controller.list(query);

      expect(listArtists).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────

  describe('getById', (): void => {
    it('delegates to adminCatalogService.getArtist', async (): Promise<void> => {
      const artist = makeArtist();
      getArtist.mockResolvedValue(artist);

      const result = await controller.getById('artist-1');

      expect(getArtist).toHaveBeenCalledWith('artist-1');
      expect(result).toBe(artist);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', (): void => {
    it('delegates to adminCatalogService.updateArtist', async (): Promise<void> => {
      const updated = makeArtist({ name: 'Pink Floyd', slug: 'pink-floyd' });
      updateArtist.mockResolvedValue(updated);

      const body = { name: 'Pink Floyd' };
      const result = await controller.update('artist-1', body);

      expect(updateArtist).toHaveBeenCalledWith('artist-1', body);
      expect(result).toBe(updated);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', (): void => {
    it('delegates to adminCatalogService.deleteArtist', async (): Promise<void> => {
      deleteArtist.mockResolvedValue(makeArtist());

      await controller.remove('artist-1');

      expect(deleteArtist).toHaveBeenCalledWith('artist-1');
    });
  });
});
