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

import type { CreateTabDto } from '../../dto/user/create-tab.dto';
import { TabsUserController } from '../tabs-user.controller';
import type { TabsService } from '../../tabs.service';

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

function makeUser(): User {
  return {
    id: 'user-1',
    supabaseAuthId: 'sup-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    blockedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as User;
}

describe('TabsUserController', (): void => {
  let createTab: jest.Mock;
  let listUserTabs: jest.Mock;
  let updateTab: jest.Mock;
  let submitTab: jest.Mock;
  let softDeleteTab: jest.Mock;
  let controller: TabsUserController;
  let user: User;

  beforeEach((): void => {
    createTab = jest.fn();
    listUserTabs = jest.fn();
    updateTab = jest.fn();
    submitTab = jest.fn();
    softDeleteTab = jest.fn();

    const tabsService = {
      createTab,
      listUserTabs,
      updateTab,
      submitTab,
      softDeleteTab,
    } as unknown as TabsService;

    controller = new TabsUserController(tabsService);
    user = makeUser();
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', (): void => {
    it('calls tabsService.createTab and returns mapped response', async (): Promise<void> => {
      const body = {
        songId: 'song-1',
        content: 'content',
        tabType: 'CHORDS' as const,
        instrument: 'GUITAR' as const,
        difficulty: 'BEGINNER' as const,
      };
      const tab = makeTab();
      createTab.mockResolvedValue(tab);

      const result = await controller.create(user, body as CreateTabDto);

      expect(createTab).toHaveBeenCalledWith({ ...body, authorUserId: 'user-1' });
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
        versionNumber: tab.versionNumber,
        submittedAt: null,
        publishedAt: null,
        createdAt: tab.createdAt.toISOString(),
        updatedAt: tab.updatedAt.toISOString(),
      });
    });
  });

  // ── list ────────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('calls tabsService.listUserTabs and returns data with pageInfo', async (): Promise<void> => {
      const tab = makeTab();
      listUserTabs.mockResolvedValue({
        items: [tab],
        nextCursor: null,
        hasMore: false,
      });

      const query = { limit: 10 };
      const result = await controller.list(user, query);

      expect(listUserTabs).toHaveBeenCalledWith('user-1', query);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(expect.objectContaining({ id: tab.id, songId: tab.songId }));
      expect(result.pageInfo).toEqual({ nextCursor: null, hasMore: false });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', (): void => {
    it('calls tabsService.updateTab and returns mapped response', async (): Promise<void> => {
      const body = { content: 'updated content' };
      const tab = makeTab({ content: 'updated content' });
      updateTab.mockResolvedValue(tab);

      const result = await controller.update(user, 'tab-1', body);

      expect(updateTab).toHaveBeenCalledWith('tab-1', 'user-1', body);
      expect(result.content).toBe('updated content');
      expect(result.id).toBe('tab-1');
    });
  });

  // ── submit ──────────────────────────────────────────────────────────────

  describe('submit', (): void => {
    it('calls tabsService.submitTab and returns mapped response', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PENDING });
      submitTab.mockResolvedValue(tab);

      const result = await controller.submit(user, 'tab-1');

      expect(submitTab).toHaveBeenCalledWith('tab-1', 'user-1');
      expect(result.status).toBe(TabStatus.PENDING);
      expect(result.id).toBe('tab-1');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', (): void => {
    it('calls tabsService.softDeleteTab', async (): Promise<void> => {
      softDeleteTab.mockResolvedValue(undefined);

      await controller.remove(user, 'tab-1');

      expect(softDeleteTab).toHaveBeenCalledWith('tab-1', 'user-1');
    });
  });
});
