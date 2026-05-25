import { NotFoundException } from '@nestjs/common';

import { ArtistService } from '../artist.service';
import { ArtistRepository } from '../../repositories/artist.repository';
import { SongRepository } from '../../repositories/song.repository';
import { makeArtist } from '@test/factories/make-artist';
import { makeSong } from '@test/factories/make-song';

describe('ArtistService', () => {
  let service: ArtistService;
  let artistRepo: jest.Mocked<ArtistRepository>;
  let songRepo: jest.Mocked<SongRepository>;

  beforeEach((): void => {
    artistRepo = {
      findAll: jest.fn(),
      listCursor: jest.fn(),
      findBySlug: jest.fn(),
    } as unknown as jest.Mocked<ArtistRepository>;

    songRepo = {
      listByArtist: jest.fn(),
      countPublishedTabs: jest.fn(),
      countPublishedTabsBatch: jest.fn(),
    } as unknown as jest.Mocked<SongRepository>;

    service = new ArtistService(artistRepo, songRepo);
  });

  describe('getAllForSelect', () => {
    it('maps artists to { id, name, slug } array without sortName', async (): Promise<void> => {
      const artists = [
        makeArtist({
          id: '00000000-0000-0000-0000-000000000101',
          name: 'Paco de Lucia',
          slug: 'paco-de-lucia',
          sortName: 'Lucia, Paco de',
        }),
        makeArtist({
          id: '00000000-0000-0000-0000-000000000102',
          name: 'The Beatles',
          slug: 'the-beatles',
          sortName: 'Beatles, The',
        }),
      ];
      artistRepo.findAll.mockResolvedValue(artists);

      const result = await service.getAllForSelect();

      expect(result).toEqual([
        { id: artists[0].id, name: 'Paco de Lucia', slug: 'paco-de-lucia' },
        { id: artists[1].id, name: 'The Beatles', slug: 'the-beatles' },
      ]);
    });

    it('returns empty array when no artists exist', async (): Promise<void> => {
      artistRepo.findAll.mockResolvedValue([]);

      const result = await service.getAllForSelect();

      expect(result).toEqual([]);
    });

    it('strips sortName and timestamp fields', async (): Promise<void> => {
      artistRepo.findAll.mockResolvedValue([makeArtist({ sortName: 'Test, Sort' })]);

      const result = await service.getAllForSelect();

      expect(result[0]).not.toHaveProperty('sortName');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
      expect(result[0]).not.toHaveProperty('deletedAt');
    });
  });

  describe('listArtists', () => {
    it('maps repository result to the response envelope', async (): Promise<void> => {
      const artist = makeArtist({
        id: '00000000-0000-0000-0000-000000000101',
        name: 'The Beatles',
        slug: 'the-beatles',
        sortName: 'Beatles, The',
      });
      artistRepo.listCursor.mockResolvedValue({
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
      artistRepo.listCursor.mockResolvedValue({
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
      artistRepo.listCursor.mockResolvedValue({
        items: [artist],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listArtists({ limit: 20 });

      expect(result.data[0].sortName).toBeNull();
    });

    it('forwards cursor, limit, and q params to the repository unchanged', async (): Promise<void> => {
      artistRepo.listCursor.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const params = { cursor: 'some-cursor-value', limit: 10, q: 'bea' };
      await service.listArtists(params);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(artistRepo.listCursor).toHaveBeenCalledWith(params);
    });

    it('returns hasMore: true and nextCursor when repository signals more pages', async (): Promise<void> => {
      const artist = makeArtist();
      const nextCursor = 'next-page-cursor';
      artistRepo.listCursor.mockResolvedValue({
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
      artistRepo.listCursor.mockResolvedValue({
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

  describe('getArtistBySlug', () => {
    it('returns artist with songs and published tab counts', async (): Promise<void> => {
      const artist = makeArtist({ id: 'a1', slug: 'the-beatles' });
      const song = makeSong({
        id: 's1',
        artistId: 'a1',
        title: 'Hey Jude',
        slug: 'hey-jude',
      });
      const songWithRelations = {
        ...song,
        artist: { id: 'a1', name: 'The Beatles', slug: 'the-beatles' },
        songGenres: [],
      };

      artistRepo.findBySlug.mockResolvedValue(artist);
      songRepo.listByArtist.mockResolvedValue([songWithRelations]);
      songRepo.countPublishedTabsBatch.mockResolvedValue(new Map([['s1', 3]]));

      const result = await service.getArtistBySlug('the-beatles');

      expect(result.id).toBe('a1');
      expect(result.slug).toBe('the-beatles');
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].publishedTabCount).toBe(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(songRepo.countPublishedTabsBatch).toHaveBeenCalledWith(['s1']);
    });

    it('throws NotFoundException when artist does not exist', async (): Promise<void> => {
      artistRepo.findBySlug.mockResolvedValue(null);

      await expect(service.getArtistBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns empty songs array when artist has no songs', async (): Promise<void> => {
      const artist = makeArtist({ id: 'a1', slug: 'solo-artist' });
      artistRepo.findBySlug.mockResolvedValue(artist);
      songRepo.listByArtist.mockResolvedValue([]);
      songRepo.countPublishedTabsBatch.mockResolvedValue(new Map());

      const result = await service.getArtistBySlug('solo-artist');

      expect(result.songs).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(songRepo.countPublishedTabsBatch).toHaveBeenCalledWith([]);
    });

    it('returns 0 tab count for songs with no published tabs', async (): Promise<void> => {
      const artist = makeArtist({ id: 'a1', slug: 'new-artist' });
      const song = makeSong({ id: 's1', artistId: 'a1' });
      const songWithRelations = {
        ...song,
        artist: { id: 'a1', name: 'New Artist', slug: 'new-artist' },
        songGenres: [],
      };

      artistRepo.findBySlug.mockResolvedValue(artist);
      songRepo.listByArtist.mockResolvedValue([songWithRelations]);
      songRepo.countPublishedTabsBatch.mockResolvedValue(new Map());

      const result = await service.getArtistBySlug('new-artist');

      expect(result.songs[0].publishedTabCount).toBe(0);
    });
  });
});
