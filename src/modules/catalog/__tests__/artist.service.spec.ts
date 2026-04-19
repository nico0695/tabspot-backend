jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { ArtistService } from '../artist.service';
import { ArtistRepository } from '../repositories/artist.repository';
import { makeArtist } from '../../../../test/factories/make-artist';

describe('ArtistService', () => {
  let service: ArtistService;
  let repository: jest.Mocked<ArtistRepository>;

  beforeEach((): void => {
    repository = {
      listCursor: jest.fn(),
    } as unknown as jest.Mocked<ArtistRepository>;

    service = new ArtistService(repository);
  });

  describe('listArtists', () => {
    it('maps repository result to the response envelope', async (): Promise<void> => {
      const artist = makeArtist({
        id: '00000000-0000-0000-0000-000000000101',
        name: 'The Beatles',
        slug: 'the-beatles',
        sortName: 'Beatles, The',
      });
      repository.listCursor.mockResolvedValue({
        items: [artist],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listArtists({ limit: 20 });

      expect(result).toEqual({
        data: [
          {
            id: artist.id,
            name: artist.name,
            slug: artist.slug,
            sortName: artist.sortName,
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false },
      });
    });

    it('strips extra Artist fields (createdAt, updatedAt, deletedAt) from response data', async (): Promise<void> => {
      const artist = makeArtist();
      repository.listCursor.mockResolvedValue({
        items: [artist],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listArtists({ limit: 20 });

      expect(result.data[0]).not.toHaveProperty('createdAt');
      expect(result.data[0]).not.toHaveProperty('updatedAt');
      expect(result.data[0]).not.toHaveProperty('deletedAt');
    });

    it('preserves nullable sortName when the artist has no sortName', async (): Promise<void> => {
      const artist = makeArtist({ sortName: null });
      repository.listCursor.mockResolvedValue({
        items: [artist],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listArtists({ limit: 20 });

      expect(result.data[0].sortName).toBeNull();
    });

    it('forwards cursor, limit, and q params to the repository unchanged', async (): Promise<void> => {
      repository.listCursor.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const params = { cursor: 'some-cursor-value', limit: 10, q: 'bea' };
      await service.listArtists(params);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.listCursor).toHaveBeenCalledWith(params);
    });

    it('returns hasMore: true and nextCursor when repository signals more pages', async (): Promise<void> => {
      const artist = makeArtist();
      const nextCursor = 'next-page-cursor';
      repository.listCursor.mockResolvedValue({
        items: [artist],
        nextCursor,
        hasMore: true,
      });

      const result = await service.listArtists({ limit: 1 });

      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).toBe(nextCursor);
    });

    it('maps multiple artists to the response data array', async (): Promise<void> => {
      const artists = [
        makeArtist({
          id: '00000000-0000-0000-0000-000000000101',
          name: 'The Beatles',
          slug: 'the-beatles',
          sortName: 'Beatles, The',
        }),
        makeArtist({
          id: '00000000-0000-0000-0000-000000000102',
          name: 'Radiohead',
          slug: 'radiohead',
          sortName: null,
        }),
      ];
      repository.listCursor.mockResolvedValue({
        items: artists,
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listArtists({ limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: artists[0].id,
        name: 'The Beatles',
        slug: 'the-beatles',
        sortName: 'Beatles, The',
      });
      expect(result.data[1]).toEqual({
        id: artists[1].id,
        name: 'Radiohead',
        slug: 'radiohead',
        sortName: null,
      });
    });
  });
});
