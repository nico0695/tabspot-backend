jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { GenresPublicController } from '../genres-public.controller';
import { GenresService } from '../genres.service';
import { makeGenre } from '../../../../test/factories/make-genre';

describe('GenresPublicController', () => {
  let controller: GenresPublicController;
  let service: jest.Mocked<GenresService>;

  beforeEach((): void => {
    service = {
      listGenres: jest.fn(),
    } as unknown as jest.Mocked<GenresService>;

    controller = new GenresPublicController(service);
  });

  describe('list', () => {
    it('delegates to genresService.listGenres and returns the result', async (): Promise<void> => {
      const genre = makeGenre();
      const response = {
        data: [{ id: genre.id, name: genre.name, slug: genre.slug }],
        pageInfo: { nextCursor: null, hasMore: false },
      };
      service.listGenres.mockResolvedValue(response);

      const result = await controller.list({ limit: 20 });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listGenres).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toBe(response);
    });

    it('forwards the cursor query param to the service', async (): Promise<void> => {
      service.listGenres.mockResolvedValue({
        data: [],
        pageInfo: { nextCursor: null, hasMore: false },
      });

      await controller.list({ cursor: 'some-cursor', limit: 10 });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listGenres).toHaveBeenCalledWith({ cursor: 'some-cursor', limit: 10 });
    });
  });
});
