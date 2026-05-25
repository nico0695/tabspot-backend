import { NotFoundException } from '@nestjs/common';

import { TabsService } from '@modules/tabs/tabs.service';

import { SongService } from '../song.service';
import { SongRepository } from '../../repositories/song.repository';
import { makeSong } from '@test/factories/make-song';

describe('SongService', () => {
  let service: SongService;
  let songRepo: jest.Mocked<SongRepository>;
  let tabsService: jest.Mocked<TabsService>;

  beforeEach((): void => {
    songRepo = {
      findAll: jest.fn(),
      listCursor: jest.fn(),
      findBySlug: jest.fn(),
    } as unknown as jest.Mocked<SongRepository>;

    tabsService = {
      listPublished: jest.fn(),
    } as unknown as jest.Mocked<TabsService>;

    service = new SongService(songRepo, tabsService);
  });

  describe('getAllForSelect', () => {
    it('maps repository songs to the lightweight select shape', async (): Promise<void> => {
      songRepo.findAll.mockResolvedValue([
        makeSong({
          id: '00000000-0000-0000-0000-000000000201',
          title: 'Hey Jude',
          slug: 'hey-jude',
        }),
        makeSong({
          id: '00000000-0000-0000-0000-000000000202',
          title: 'Let It Be',
          slug: 'let-it-be',
        }),
      ]);

      const result = await service.getAllForSelect();

      expect(result).toEqual([
        { id: '00000000-0000-0000-0000-000000000201', title: 'Hey Jude' },
        { id: '00000000-0000-0000-0000-000000000202', title: 'Let It Be' },
      ]);
    });

    it('strips extra song fields from the select response', async (): Promise<void> => {
      songRepo.findAll.mockResolvedValue([makeSong()]);

      const result = await service.getAllForSelect();

      expect(result[0]).not.toHaveProperty('artistId');
      expect(result[0]).not.toHaveProperty('slug');
      expect(result[0]).not.toHaveProperty('subtitle');
      expect(result[0]).not.toHaveProperty('releaseYear');
    });

    it('returns an empty array when there are no active songs', async (): Promise<void> => {
      songRepo.findAll.mockResolvedValue([]);

      await expect(service.getAllForSelect()).resolves.toEqual([]);
    });
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
      songRepo.listCursor.mockResolvedValue({
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
      songRepo.listCursor.mockResolvedValue({
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
      songRepo.listCursor.mockResolvedValue({
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
      songRepo.listCursor.mockResolvedValue({
        items: [song],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listSongs({ limit: 20 });

      expect(result.data[0].artistId).toBe('00000000-0000-0000-0000-000000000999');
      expect(result.data[0]).not.toHaveProperty('artist');
    });

    it('forwards cursor, limit, q, and artistId params to the repository unchanged', async (): Promise<void> => {
      songRepo.listCursor.mockResolvedValue({
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
      expect(songRepo.listCursor).toHaveBeenCalledWith(params);
    });

    it('returns hasMore: true and nextCursor when repository signals more pages', async (): Promise<void> => {
      const song = makeSong();
      const nextCursor = 'next-page-cursor';
      songRepo.listCursor.mockResolvedValue({
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
      songRepo.listCursor.mockResolvedValue({
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

  describe('getSongBySlug', () => {
    const songWithRelations = {
      ...makeSong({ id: 's1', slug: 'hey-jude' }),
      artist: { id: 'a1', name: 'The Beatles', slug: 'the-beatles' },
      songGenres: [{ genre: { id: 'g1', name: 'Rock', slug: 'rock' } }],
    };

    it('returns song detail with published tabs', async (): Promise<void> => {
      songRepo.findBySlug.mockResolvedValue(songWithRelations);
      tabsService.listPublished.mockResolvedValue({
        items: [
          {
            id: 't1',
            songId: 's1',
            authorUserId: 'u1',
            titleOverride: null,
            content: '{title: Hey Jude}',
            tabType: 'CHORDS',
            instrument: 'GUITAR',
            difficulty: 'BEGINNER',
            status: 'PUBLISHED',
            versionNumber: 1,
            submittedAt: new Date(),
            publishedAt: new Date(),
            moderatedByUserId: null,
            moderationNotes: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            deletedAt: null,
            author: { displayName: 'John' },
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.getSongBySlug('hey-jude', { limit: 20 });

      expect(result.id).toBe('s1');
      expect(result.artist.slug).toBe('the-beatles');
      expect(result.genres).toHaveLength(1);
      expect(result.genres[0].slug).toBe('rock');
      expect(result.tabs.data).toHaveLength(1);
      expect(result.tabs.data[0].tabType).toBe('CHORDS');
    });

    it('throws NotFoundException when song does not exist', async (): Promise<void> => {
      songRepo.findBySlug.mockResolvedValue(null);

      await expect(service.getSongBySlug('nonexistent', { limit: 20 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns empty tabs array when song has no published tabs', async (): Promise<void> => {
      songRepo.findBySlug.mockResolvedValue(songWithRelations);
      tabsService.listPublished.mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.getSongBySlug('hey-jude', { limit: 20 });

      expect(result.tabs.data).toEqual([]);
      expect(result.tabs.pageInfo.hasMore).toBe(false);
    });
  });
});
