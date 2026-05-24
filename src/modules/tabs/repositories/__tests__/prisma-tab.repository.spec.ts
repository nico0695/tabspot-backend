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

import { BadRequestException } from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { PrismaTabRepository } from '../prisma-tab.repository';
import type { PrismaService } from '@src/prisma/prisma.service';
import type { AdminTabRow, TabWithAuthor } from '../../ports/tab-repository.port';

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    songId: 'song-1',
    authorUserId: 'user-1',
    titleOverride: null,
    content: '{title: Test}\n[C]Hello',
    tabType: 'CHORDS',
    instrument: 'GUITAR',
    difficulty: 'BEGINNER',
    status: TabStatus.DRAFT,
    versionNumber: 1,
    submittedAt: null,
    publishedAt: null,
    moderatedByUserId: null,
    moderationNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makeTabWithAuthor(overrides: Partial<Tab> = {}): TabWithAuthor {
  return {
    ...makeTab(overrides),
    author: { displayName: 'Test User' },
  };
}

function makeAdminTab(overrides: Partial<Tab> = {}): AdminTabRow {
  return {
    ...makeTab(overrides),
    author: {
      id: 'user-1',
      displayName: 'Test User',
      email: 'user@example.com',
      status: 'ACTIVE',
      role: 'USER',
    },
    song: {
      id: 'song-1',
      title: 'Test Song',
      slug: 'test-song',
      deletedAt: null,
      artist: {
        id: 'artist-1',
        name: 'Test Artist',
        slug: 'test-artist',
      },
    },
  };
}

describe('PrismaTabRepository', (): void => {
  let tabCreate: jest.Mock;
  let tabFindMany: jest.Mock;
  let tabUpdate: jest.Mock;
  let tabFindUnique: jest.Mock;
  let tabCount: jest.Mock;
  let repo: PrismaTabRepository;

  beforeEach((): void => {
    tabCreate = jest.fn();
    tabFindMany = jest.fn();
    tabUpdate = jest.fn();
    tabFindUnique = jest.fn();
    tabCount = jest.fn();

    const prisma = {
      tab: {
        create: tabCreate,
        findMany: tabFindMany,
        update: tabUpdate,
        findUnique: tabFindUnique,
        count: tabCount,
      },
    } as unknown as PrismaService;

    repo = new PrismaTabRepository(prisma);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', (): void => {
    it('creates a tab with status DRAFT and versionNumber 1', async (): Promise<void> => {
      const input = {
        songId: 'song-1',
        authorUserId: 'user-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
      };
      const created = makeTab();
      tabCreate.mockResolvedValue(created);

      const result = await repo.create(input);

      expect(result).toBe(created);
      expect(tabCreate).toHaveBeenCalledWith({
        data: {
          songId: 'song-1',
          authorUserId: 'user-1',
          content: 'content',
          tabType: 'CHORDS',
          instrument: 'GUITAR',
          difficulty: 'BEGINNER',
          titleOverride: null,
          status: TabStatus.DRAFT,
          submittedAt: null,
          publishedAt: null,
          moderatedByUserId: null,
          moderationNotes: null,
          versionNumber: 1,
        },
      });
    });

    it('persists admin-provided status metadata when supplied', async (): Promise<void> => {
      const input = {
        songId: 'song-1',
        authorUserId: 'admin-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
        status: TabStatus.PUBLISHED,
        submittedAt: new Date('2026-02-01T00:00:00.000Z'),
        publishedAt: new Date('2026-02-02T00:00:00.000Z'),
        moderatedByUserId: 'admin-1',
        moderationNotes: null,
      };
      const created = makeTab({ status: TabStatus.PUBLISHED });
      tabCreate.mockResolvedValue(created);

      await repo.create(input);

      const [[callArg]] = tabCreate.mock.calls as [{ data: Record<string, unknown> }][];

      expect(callArg).toBeDefined();
      expect(callArg.data).toEqual(
        expect.objectContaining({
          status: TabStatus.PUBLISHED,
          submittedAt: input.submittedAt,
          publishedAt: input.publishedAt,
          moderatedByUserId: 'admin-1',
          moderationNotes: null,
        }),
      );
    });

    it('throws BadRequestException with INVALID_SONG_ID on FK violation (P2003)', async (): Promise<void> => {
      const input = {
        songId: 'bad-song',
        authorUserId: 'user-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
      };
      tabCreate.mockRejectedValue({ code: 'P2003', message: 'FK violation' });

      await expect(repo.create(input)).rejects.toThrow(BadRequestException);
    });
  });

  // ── findByUser ──────────────────────────────────────────────────────────

  describe('findByUser', (): void => {
    it('returns items with hasMore=false when results <= limit', async (): Promise<void> => {
      const tabs = [makeTab({ id: 'tab-1' }), makeTab({ id: 'tab-2' })];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findByUser('user-1', { limit: 10 });

      expect(result.items).toEqual(tabs);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(tabFindMany).toHaveBeenCalledWith({
        where: { authorUserId: 'user-1', deletedAt: null },
        orderBy: { id: 'asc' },
        take: 11,
      });
    });

    it('returns items with hasMore=true and nextCursor when results > limit', async (): Promise<void> => {
      const tabs = [makeTab({ id: 'tab-1' }), makeTab({ id: 'tab-2' }), makeTab({ id: 'tab-3' })];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findByUser('user-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.nextCursor).not.toBeNull();
    });

    it('applies cursor filter when cursor is provided', async (): Promise<void> => {
      const cursorPayload = Buffer.from(JSON.stringify({ id: 'cursor-id' })).toString('base64url');
      tabFindMany.mockResolvedValue([]);

      await repo.findByUser('user-1', { limit: 10, cursor: cursorPayload });

      expect(tabFindMany).toHaveBeenCalledWith({
        where: {
          authorUserId: 'user-1',
          deletedAt: null,
          id: { gt: 'cursor-id' },
        },
        orderBy: { id: 'asc' },
        take: 11,
      });
    });
  });

  // ── updateContent ───────────────────────────────────────────────────────

  describe('updateContent', (): void => {
    it('delegates to prisma.tab.update with correct shape', async (): Promise<void> => {
      const updated = makeTab({ content: 'new content' });
      tabUpdate.mockResolvedValue(updated);

      const result = await repo.updateContent('tab-1', { content: 'new content' });

      expect(result).toBe(updated);
      expect(tabUpdate).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        data: { content: 'new content' },
      });
    });

    it('updates moderationNotes when provided', async (): Promise<void> => {
      const updated = makeTab({ moderationNotes: 'Needs work' });
      tabUpdate.mockResolvedValue(updated);

      await repo.updateContent('tab-1', { moderationNotes: 'Needs work' });

      expect(tabUpdate).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        data: { moderationNotes: 'Needs work' },
      });
    });
  });

  // ── softDelete ──────────────────────────────────────────────────────────

  describe('softDelete', (): void => {
    it('sets deletedAt via prisma.tab.update', async (): Promise<void> => {
      tabUpdate.mockResolvedValue(makeTab({ deletedAt: new Date() }));

      await repo.softDelete('tab-1');

      expect(tabUpdate).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });
  });

  // ── updateStatus ────────────────────────────────────────────────────────

  describe('updateStatus', (): void => {
    it('delegates to prisma.tab.update with status and meta fields', async (): Promise<void> => {
      const updated = makeTab({ status: TabStatus.PENDING });
      const submittedAt = new Date('2026-02-01');
      tabUpdate.mockResolvedValue(updated);

      const result = await repo.updateStatus('tab-1', TabStatus.PENDING, { submittedAt });

      expect(result).toBe(updated);
      expect(tabUpdate).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        data: {
          status: TabStatus.PENDING,
          submittedAt,
        },
      });
    });
  });

  // ── findById ───────────────────────────────────────────────────────────

  describe('findById', (): void => {
    it('returns tab with author included', async (): Promise<void> => {
      const tabWithAuthor = makeTabWithAuthor();
      tabFindUnique.mockResolvedValue(tabWithAuthor);

      const result = await repo.findById('tab-1');

      expect(result).toBe(tabWithAuthor);
      expect(result?.author.displayName).toBe('Test User');
      const expectedInclude = {
        author: { select: { displayName: true } },
        song: {
          select: {
            id: true,
            title: true,
            slug: true,
            subtitle: true,
            releaseYear: true,
            artist: { select: { id: true, name: true, slug: true } },
            songGenres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
          },
        },
      };
      expect(tabFindUnique).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        include: expectedInclude,
      });
    });

    it('returns null when tab is not found', async (): Promise<void> => {
      tabFindUnique.mockResolvedValue(null);

      const result = await repo.findById('missing');

      expect(result).toBeNull();
      expect(tabFindUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
        include: {
          author: { select: { displayName: true } },
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              subtitle: true,
              releaseYear: true,
              artist: { select: { id: true, name: true, slug: true } },
              songGenres: {
                select: { genre: { select: { id: true, name: true, slug: true } } },
              },
            },
          },
        },
      });
    });
  });

  // ── findAdminById ─────────────────────────────────────────────────────

  describe('findAdminById', (): void => {
    it('returns admin tab detail with enriched author and song', async (): Promise<void> => {
      const tab = makeAdminTab();
      tabFindUnique.mockResolvedValue(tab);

      const result = await repo.findAdminById('tab-1');

      expect(result).toBe(tab);
      expect(tabFindUnique).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              status: true,
              role: true,
            },
          },
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              deletedAt: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    });
  });

  // ── findAllAdmin ───────────────────────────────────────────────────────

  describe('findAllAdmin', (): void => {
    it('filters out soft-deleted tabs by default', async (): Promise<void> => {
      const tabs = [makeAdminTab()];
      tabFindMany.mockResolvedValue(tabs);
      tabCount.mockResolvedValue(1);

      const result = await repo.findAllAdmin({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items: tabs, totalCount: 1 });
      expect(tabFindMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              status: true,
              role: true,
            },
          },
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              deletedAt: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
      expect(tabCount).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });

    it('passes includeDeleted sentinel when admin requests deleted tabs', async (): Promise<void> => {
      const tabs = [makeAdminTab({ deletedAt: new Date('2026-03-01') })];
      tabFindMany.mockResolvedValue(tabs);
      tabCount.mockResolvedValue(1);

      await repo.findAllAdmin({ page: 2, pageSize: 10, includeDeleted: true });

      expect(tabFindMany).toHaveBeenCalledWith({
        where: { includeDeleted: true },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              status: true,
              role: true,
            },
          },
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              deletedAt: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
      expect(tabCount).toHaveBeenCalledWith({ where: { includeDeleted: true } });
    });

    it('preserves status filter while including deleted tabs', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);
      tabCount.mockResolvedValue(0);

      await repo.findAllAdmin({
        page: 1,
        pageSize: 20,
        status: TabStatus.PENDING,
        includeDeleted: true,
      });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: TabStatus.PENDING, includeDeleted: true },
        }),
      );
      expect(tabCount).toHaveBeenCalledWith({
        where: { status: TabStatus.PENDING, includeDeleted: true },
      });
    });
  });

  // ── findPublished ──────────────────────────────────────────────────────

  describe('findPublished', (): void => {
    const defaultOrderBy = [{ createdAt: 'desc' }, { id: 'desc' }];

    it('returns only PUBLISHED non-deleted tabs with author', async (): Promise<void> => {
      const tabs = [makeTabWithAuthor({ id: 'tab-1', status: TabStatus.PUBLISHED })];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findPublished({ limit: 10 });

      expect(result.items).toEqual(tabs);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(tabFindMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: defaultOrderBy,
        take: 11,
        include: { author: { select: { displayName: true } } },
      });
    });

    it('applies songId filter', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, songId: 'song-42' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ songId: 'song-42' }) as Record<string, unknown>,
        }),
      );
    });

    it('applies tabType filter', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, tabType: 'TAB' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tabType: 'TAB' }) as Record<string, unknown>,
        }),
      );
    });

    it('applies instrument filter', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, instrument: 'BASS' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ instrument: 'BASS' }) as Record<string, unknown>,
        }),
      );
    });

    it('applies difficulty filter', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, difficulty: 'ADVANCED' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ difficulty: 'ADVANCED' }) as Record<string, unknown>,
        }),
      );
    });

    it('returns hasMore=true and nextCursor when results exceed limit', async (): Promise<void> => {
      const tabs = [
        makeTabWithAuthor({ id: 'tab-1', status: TabStatus.PUBLISHED }),
        makeTabWithAuthor({ id: 'tab-2', status: TabStatus.PUBLISHED }),
        makeTabWithAuthor({ id: 'tab-3', status: TabStatus.PUBLISHED }),
      ];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findPublished({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it('applies legacy id-only cursor filter', async (): Promise<void> => {
      const cursorPayload = Buffer.from(JSON.stringify({ id: 'cursor-id' })).toString('base64url');
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, cursor: cursorPayload });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { gt: 'cursor-id' } }) as Record<string, unknown>,
        }),
      );
    });

    it('includes author displayName in results', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10 });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { author: { select: { displayName: true } } },
        }),
      );
    });

    // ── genreId filter ─────────────────────────────────────────────────

    it('applies genreId filter via where.song.songGenres.some', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, genreId: 'genre-1' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            song: { songGenres: { some: { genreId: 'genre-1' } } },
          }) as Record<string, unknown>,
        }),
      );
    });

    // ── artistId filter ────────────────────────────────────────────────

    it('applies artistId filter via where.song.artistId', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, artistId: 'artist-1' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            song: { artistId: 'artist-1' },
          }) as Record<string, unknown>,
        }),
      );
    });

    // ── genreId + artistId combined ────────────────────────────────────

    it('merges genreId and artistId into same where.song object', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, genreId: 'genre-1', artistId: 'artist-1' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            song: {
              songGenres: { some: { genreId: 'genre-1' } },
              artistId: 'artist-1',
            },
          }) as Record<string, unknown>,
        }),
      );
    });

    // ── sortBy / order ─────────────────────────────────────────────────

    it('uses sortBy=publishedAt and order=asc when specified', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, sortBy: 'publishedAt', order: 'asc' });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('defaults to orderBy createdAt desc when no sortBy/order provided', async (): Promise<void> => {
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10 });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: defaultOrderBy,
        }),
      );
    });

    // ── sort-aware cursor ──────────────────────────────────────────────

    it('applies sort-aware cursor with keyset pagination for desc order', async (): Promise<void> => {
      const sortValue = '2026-03-15T00:00:00.000Z';
      const cursorPayload = Buffer.from(
        JSON.stringify({ id: 'tab-5', sortBy: 'createdAt', sortValue }),
      ).toString('base64url');
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({ limit: 10, cursor: cursorPayload });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { createdAt: { lt: new Date(sortValue) } },
              { createdAt: new Date(sortValue), id: { lt: 'tab-5' } },
            ],
          }) as Record<string, unknown>,
        }),
      );
    });

    it('applies sort-aware cursor with keyset pagination for asc order', async (): Promise<void> => {
      const sortValue = '2026-03-15T00:00:00.000Z';
      const cursorPayload = Buffer.from(
        JSON.stringify({ id: 'tab-5', sortBy: 'publishedAt', sortValue }),
      ).toString('base64url');
      tabFindMany.mockResolvedValue([]);

      await repo.findPublished({
        limit: 10,
        cursor: cursorPayload,
        sortBy: 'publishedAt',
        order: 'asc',
      });

      expect(tabFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { publishedAt: { gt: new Date(sortValue) } },
              { publishedAt: new Date(sortValue), id: { gt: 'tab-5' } },
            ],
          }) as Record<string, unknown>,
        }),
      );
    });

    it('encodes sort-aware cursor with sortBy and sortValue', async (): Promise<void> => {
      const publishedDate = new Date('2026-06-01');
      const tabs = [
        makeTabWithAuthor({ id: 'tab-1', status: TabStatus.PUBLISHED, publishedAt: publishedDate }),
        makeTabWithAuthor({ id: 'tab-2', status: TabStatus.PUBLISHED, publishedAt: publishedDate }),
        makeTabWithAuthor({ id: 'tab-3', status: TabStatus.PUBLISHED, publishedAt: publishedDate }),
      ];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findPublished({ limit: 2, sortBy: 'publishedAt', order: 'desc' });

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();

      const decoded = JSON.parse(Buffer.from(result.nextCursor!, 'base64url').toString('utf8')) as {
        id: string;
        sortBy: string;
        sortValue: string;
      };
      expect(decoded.id).toBe('tab-2');
      expect(decoded.sortBy).toBe('publishedAt');
      expect(decoded.sortValue).toBe(publishedDate.toISOString());
    });
  });
});
