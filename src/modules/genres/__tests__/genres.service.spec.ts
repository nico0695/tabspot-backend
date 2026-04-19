jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { GenresService } from '../genres.service';
import { GenreRepository } from '../repositories/genre.repository';
import { makeGenre } from '../../../../test/factories/make-genre';

describe('GenresService', () => {
  let service: GenresService;
  let repository: jest.Mocked<GenreRepository>;

  beforeEach((): void => {
    repository = {
      listCursor: jest.fn(),
    } as unknown as jest.Mocked<GenreRepository>;

    service = new GenresService(repository);
  });

  describe('listGenres', () => {
    it('maps repository result to the response envelope', async (): Promise<void> => {
      const genre = makeGenre({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Rock',
        slug: 'rock',
      });
      repository.listCursor.mockResolvedValue({
        items: [genre],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listGenres({ limit: 20 });

      expect(result).toEqual({
        data: [{ id: genre.id, name: genre.name, slug: genre.slug }],
        pageInfo: { nextCursor: null, hasMore: false },
      });
    });

    it('strips extra Genre fields (createdAt, updatedAt, deletedAt) from response data', async (): Promise<void> => {
      const genre = makeGenre();
      repository.listCursor.mockResolvedValue({
        items: [genre],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listGenres({ limit: 20 });

      expect(result.data[0]).not.toHaveProperty('createdAt');
      expect(result.data[0]).not.toHaveProperty('updatedAt');
      expect(result.data[0]).not.toHaveProperty('deletedAt');
    });

    it('forwards cursor param to repository', async (): Promise<void> => {
      repository.listCursor.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const params = { cursor: 'some-cursor-value', limit: 10 };
      await service.listGenres(params);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.listCursor).toHaveBeenCalledWith(params);
    });

    it('returns hasMore: true and nextCursor when repository signals more pages', async (): Promise<void> => {
      const genre = makeGenre();
      const nextCursor = 'next-page-cursor';
      repository.listCursor.mockResolvedValue({
        items: [genre],
        nextCursor,
        hasMore: true,
      });

      const result = await service.listGenres({ limit: 1 });

      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).toBe(nextCursor);
    });

    it('maps multiple genres to the response data array', async (): Promise<void> => {
      const genres = [
        makeGenre({ id: '00000000-0000-0000-0000-000000000001', name: 'Rock', slug: 'rock' }),
        makeGenre({ id: '00000000-0000-0000-0000-000000000002', name: 'Jazz', slug: 'jazz' }),
      ];
      repository.listCursor.mockResolvedValue({
        items: genres,
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listGenres({ limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: genres[0].id, name: 'Rock', slug: 'rock' });
      expect(result.data[1]).toEqual({ id: genres[1].id, name: 'Jazz', slug: 'jazz' });
    });
  });
});
