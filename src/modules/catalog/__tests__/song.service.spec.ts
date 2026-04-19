jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
});

import { SongService } from '../song.service';
import { SongRepository } from '../repositories/song.repository';
import { makeSong } from '../../../../test/factories/make-song';

describe('SongService', () => {
  let service: SongService;
  let repository: jest.Mocked<SongRepository>;

  beforeEach((): void => {
    repository = {
      listCursor: jest.fn(),
    } as unknown as jest.Mocked<SongRepository>;

    service = new SongService(repository);
  });

  describe('listSongs', () => {
    it('maps repository result to the response envelope', async (): Promise<void> => {
      const song = makeSong({
        id: '00000000-0000-0000-0000-000000000201',
        artistId: '00000000-0000-0000-0000-000000000101',
        title: 'Hey Jude',
        slug: 'hey-jude',
        subtitle: null,
        releaseYear: 1968,
      });
      repository.listCursor.mockResolvedValue({
        items: [song],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result).toEqual({
        data: [
          {
            id: song.id,
            artistId: song.artistId,
            title: song.title,
            slug: song.slug,
            subtitle: null,
            releaseYear: 1968,
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false },
      });
    });

    it('strips extra Song fields (createdAt, updatedAt, deletedAt) from response data', async (): Promise<void> => {
      const song = makeSong();
      repository.listCursor.mockResolvedValue({
        items: [song],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result.data[0]).not.toHaveProperty('createdAt');
      expect(result.data[0]).not.toHaveProperty('updatedAt');
      expect(result.data[0]).not.toHaveProperty('deletedAt');
    });

    it('preserves nullable subtitle and releaseYear when absent', async (): Promise<void> => {
      const song = makeSong({ subtitle: null, releaseYear: null });
      repository.listCursor.mockResolvedValue({
        items: [song],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result.data[0].subtitle).toBeNull();
      expect(result.data[0].releaseYear).toBeNull();
    });

    it('preserves flat artistId on the response (no embedded artist object)', async (): Promise<void> => {
      const song = makeSong({ artistId: '00000000-0000-0000-0000-000000000999' });
      repository.listCursor.mockResolvedValue({
        items: [song],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result.data[0].artistId).toBe('00000000-0000-0000-0000-000000000999');
      expect(result.data[0]).not.toHaveProperty('artist');
    });

    it('forwards cursor, limit, q, and artistId params to the repository unchanged', async (): Promise<void> => {
      repository.listCursor.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const params = {
        cursor: 'some-cursor-value',
        limit: 10,
        q: 'jude',
        artistId: '00000000-0000-0000-0000-000000000101',
      };
      await service.listSongs(params);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.listCursor).toHaveBeenCalledWith(params);
    });

    it('returns hasMore: true and nextCursor when repository signals more pages', async (): Promise<void> => {
      const song = makeSong();
      const nextCursor = 'next-page-cursor';
      repository.listCursor.mockResolvedValue({
        items: [song],
        nextCursor,
        hasMore: true,
      });

      const result = await service.listSongs({ limit: 1 });

      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).toBe(nextCursor);
    });

    it('maps multiple songs to the response data array', async (): Promise<void> => {
      const songs = [
        makeSong({
          id: '00000000-0000-0000-0000-000000000201',
          title: 'Hey Jude',
          slug: 'hey-jude',
        }),
        makeSong({
          id: '00000000-0000-0000-0000-000000000202',
          title: 'Let It Be',
          slug: 'let-it-be',
          subtitle: 'Naked version',
        }),
      ];
      repository.listCursor.mockResolvedValue({
        items: songs,
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe('Hey Jude');
      expect(result.data[1].title).toBe('Let It Be');
      expect(result.data[1].subtitle).toBe('Naked version');
    });
  });
});
