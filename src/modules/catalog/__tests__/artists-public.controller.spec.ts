jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { ArtistsPublicController } from '../artists-public.controller';
import { ArtistService } from '../artist.service';
import { makeArtist } from '../../../../test/factories/make-artist';

describe('ArtistsPublicController', () => {
  let controller: ArtistsPublicController;
  let service: jest.Mocked<ArtistService>;

  beforeEach((): void => {
    service = {
      listArtists: jest.fn(),
    } as unknown as jest.Mocked<ArtistService>;

    controller = new ArtistsPublicController(service);
  });

  describe('list', () => {
    it('delegates to artistService.listArtists and returns the result', async (): Promise<void> => {
      const artist = makeArtist();
      const response = {
        data: [
          {
            id: artist.id,
            name: artist.name,
            slug: artist.slug,
            sortName: artist.sortName,
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false },
      };
      service.listArtists.mockResolvedValue(response);

      const result = await controller.list({ limit: 20 });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listArtists).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toBe(response);
    });

    it('forwards cursor, q, and limit query params to the service', async (): Promise<void> => {
      service.listArtists.mockResolvedValue({
        data: [],
        pageInfo: { nextCursor: null, hasMore: false },
      });

      await controller.list({ cursor: 'some-cursor', limit: 10, q: 'bea' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listArtists).toHaveBeenCalledWith({
        cursor: 'some-cursor',
        limit: 10,
        q: 'bea',
      });
    });
  });
});
