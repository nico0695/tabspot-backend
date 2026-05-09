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
import type { TabWithAuthor } from '../../ports/tab-repository.port';

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

describe('PrismaTabRepository', (): void => {
  let tabCreate: jest.Mock;
  let tabFindMany: jest.Mock;
  let tabUpdate: jest.Mock;
  let tabFindUnique: jest.Mock;
  let repo: PrismaTabRepository;

  beforeEach((): void => {
    tabCreate = jest.fn();
    tabFindMany = jest.fn();
    tabUpdate = jest.fn();
    tabFindUnique = jest.fn();

    const prisma = {
      tab: {
        create: tabCreate,
        findMany: tabFindMany,
        update: tabUpdate,
        findUnique: tabFindUnique,
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
          versionNumber: 1,
        },
      });
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
      expect(tabFindUnique).toHaveBeenCalledWith({
        where: { id: 'tab-1' },
        include: { author: { select: { displayName: true } } },
      });
    });

    it('returns null when tab is not found', async (): Promise<void> => {
      tabFindUnique.mockResolvedValue(null);

      const result = await repo.findById('missing');

      expect(result).toBeNull();
      expect(tabFindUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
        include: { author: { select: { displayName: true } } },
      });
    });
  });

  // ── findPublished ──────────────────────────────────────────────────────

  describe('findPublished', (): void => {
    it('returns only PUBLISHED non-deleted tabs with author', async (): Promise<void> => {
      const tabs = [makeTabWithAuthor({ id: 'tab-1', status: TabStatus.PUBLISHED })];
      tabFindMany.mockResolvedValue(tabs);

      const result = await repo.findPublished({ limit: 10 });

      expect(result.items).toEqual(tabs);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(tabFindMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { id: 'asc' },
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

    it('applies cursor filter when cursor is provided', async (): Promise<void> => {
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
  });
});
