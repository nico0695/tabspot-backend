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

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { TabsPublicController } from '../tabs-public.controller';
import type { TabsService } from '../../tabs.service';
import type { TabWithAuthor } from '../../ports/tab-repository.port';

function makeTabWithAuthor(overrides: Partial<Tab> = {}): TabWithAuthor {
  return {
    id: 'tab-1',
    songId: 'song-1',
    authorUserId: 'user-1',
    titleOverride: null,
    content: '{title: Test}\n[C]Hello',
    tabType: 'CHORDS',
    instrument: 'GUITAR',
    difficulty: 'BEGINNER',
    status: TabStatus.PUBLISHED,
    versionNumber: 1,
    submittedAt: null,
    publishedAt: new Date('2026-02-01'),
    moderatedByUserId: null,
    moderationNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    author: { displayName: 'Test Author' },
    ...overrides,
  } as TabWithAuthor;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    supabaseAuthId: 'sup-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    blockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('TabsPublicController', (): void => {
  let listPublished: jest.Mock;
  let findPublicDetail: jest.Mock;
  let controller: TabsPublicController;

  beforeEach((): void => {
    listPublished = jest.fn();
    findPublicDetail = jest.fn();

    const tabsService = {
      listPublished,
      findPublicDetail,
    } as unknown as TabsService;

    controller = new TabsPublicController(tabsService);
  });

  // ── list ────────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('calls tabsService.listPublished and returns data with pageInfo', async (): Promise<void> => {
      const tab = makeTabWithAuthor();
      listPublished.mockResolvedValue({
        items: [tab],
        nextCursor: null,
        hasMore: false,
      });

      const query = { limit: 10 };
      const result = await controller.list(query);

      expect(listPublished).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: tab.id,
        songId: tab.songId,
        titleOverride: tab.titleOverride,
        tabType: tab.tabType,
        instrument: tab.instrument,
        difficulty: tab.difficulty,
        status: tab.status,
        authorDisplayName: 'Test Author',
        createdAt: tab.createdAt,
      });
      expect(result.pageInfo).toEqual({ nextCursor: null, hasMore: false });
    });

    it('maps multiple items to TabListItem shape with authorDisplayName', async (): Promise<void> => {
      const tabs = [
        makeTabWithAuthor({ id: 'tab-1' }),
        makeTabWithAuthor({ id: 'tab-2', author: { displayName: null } } as Partial<Tab>),
      ];
      listPublished.mockResolvedValue({
        items: tabs,
        nextCursor: 'next',
        hasMore: true,
      });

      const result = await controller.list({ limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].authorDisplayName).toBe('Test Author');
      expect(result.data[1].authorDisplayName).toBeNull();
      expect(result.pageInfo).toEqual({ nextCursor: 'next', hasMore: true });
    });
  });

  // ── detail ──────────────────────────────────────────────────────────────

  describe('detail', (): void => {
    it('calls tabsService.findPublicDetail and returns TabDetail shape', async (): Promise<void> => {
      const tab = makeTabWithAuthor();
      findPublicDetail.mockResolvedValue(tab);

      const result = await controller.detail('tab-1', makeUser());

      expect(findPublicDetail).toHaveBeenCalledWith(
        'tab-1',
        expect.objectContaining({ id: 'user-1' }) as User,
      );
      expect(result).toEqual({
        id: tab.id,
        songId: tab.songId,
        authorUserId: tab.authorUserId,
        titleOverride: tab.titleOverride,
        content: tab.content,
        tabType: tab.tabType,
        instrument: tab.instrument,
        difficulty: tab.difficulty,
        status: tab.status,
        authorDisplayName: 'Test Author',
        versionNumber: tab.versionNumber,
        submittedAt: tab.submittedAt,
        publishedAt: tab.publishedAt,
        createdAt: tab.createdAt,
        updatedAt: tab.updatedAt,
      });
    });

    it('works with user = undefined (anonymous)', async (): Promise<void> => {
      const tab = makeTabWithAuthor();
      findPublicDetail.mockResolvedValue(tab);

      const result = await controller.detail('tab-1', undefined);

      expect(findPublicDetail).toHaveBeenCalledWith('tab-1', undefined);
      expect(result.authorDisplayName).toBe('Test Author');
      expect(result.id).toBe('tab-1');
    });
  });
});
