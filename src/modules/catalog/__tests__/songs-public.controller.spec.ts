jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { SongsPublicController } from '../songs-public.controller';
import { SongService } from '../song.service';
import { makeSong } from '../../../../test/factories/make-song';

describe('SongsPublicController', () => {
  let controller: SongsPublicController;
  let service: jest.Mocked<SongService>;

  beforeEach((): void => {
    service = {
      listSongs: jest.fn(),
    } as unknown as jest.Mocked<SongService>;

    controller = new SongsPublicController(service);
  });

  describe('list', () => {
    it('delegates to songService.listSongs and returns the result', async (): Promise<void> => {
      const song = makeSong();
      const response = {
        data: [
          {
            id: song.id,
            artistId: song.artistId,
            title: song.title,
            slug: song.slug,
            subtitle: song.subtitle,
            releaseYear: song.releaseYear,
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false },
      };
      service.listSongs.mockResolvedValue(response);

      const result = await controller.list({ limit: 20 });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listSongs).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toBe(response);
    });

    it('forwards cursor, q, limit, and artistId query params to the service', async (): Promise<void> => {
      service.listSongs.mockResolvedValue({
        data: [],
        pageInfo: { nextCursor: null, hasMore: false },
      });

      await controller.list({
        cursor: 'some-cursor',
        limit: 10,
        q: 'jude',
        artistId: '00000000-0000-0000-0000-000000000101',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listSongs).toHaveBeenCalledWith({
        cursor: 'some-cursor',
        limit: 10,
        q: 'jude',
        artistId: '00000000-0000-0000-0000-000000000101',
      });
    });
  });
});
