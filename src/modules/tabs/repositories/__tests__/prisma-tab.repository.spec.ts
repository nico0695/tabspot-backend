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
});
