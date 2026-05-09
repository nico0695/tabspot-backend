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

import { AdminTabsController } from '../admin-tabs.controller';
import type { AdminService } from '../../services/admin.service';
import type { TabWithAuthor } from '@modules/tabs/ports/tab-repository.port';

function makeTab(overrides: Partial<Tab> = {}): TabWithAuthor {
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
    author: { displayName: 'Test User' },
    ...overrides,
  } as TabWithAuthor;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'admin-1',
    supabaseAuthId: 'sup-1',
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    blockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('AdminTabsController', (): void => {
  let listTabs: jest.Mock;
  let publishTab: jest.Mock;
  let rejectTab: jest.Mock;
  let controller: AdminTabsController;
  let user: User;

  beforeEach((): void => {
    listTabs = jest.fn();
    publishTab = jest.fn();
    rejectTab = jest.fn();

    const adminService = {
      listTabs,
      publishTab,
      rejectTab,
    } as unknown as AdminService;

    controller = new AdminTabsController(adminService);
    user = makeUser();
  });

  // ── list ────────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('calls adminService.listTabs and returns data with pageInfo', async (): Promise<void> => {
      const tab = makeTab();
      listTabs.mockResolvedValue({ items: [tab], totalCount: 1 });

      const query = { page: 1, pageSize: 20, includeDeleted: false };
      const result = await controller.list(query);

      expect(listTabs).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: [tab],
        pageInfo: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      });
    });

    it('calculates totalPages correctly for multiple pages', async (): Promise<void> => {
      listTabs.mockResolvedValue({ items: [], totalCount: 45 });

      const query = { page: 2, pageSize: 20, includeDeleted: false };
      const result = await controller.list(query);

      expect(result.pageInfo).toEqual({
        page: 2,
        pageSize: 20,
        totalCount: 45,
        totalPages: 3,
      });
    });
  });

  // ── publish ─────────────────────────────────────────────────────────────

  describe('publish', (): void => {
    it('calls adminService.publishTab with id and user.id', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PUBLISHED });
      publishTab.mockResolvedValue(tab);

      const result = await controller.publish('tab-1', user);

      expect(publishTab).toHaveBeenCalledWith('tab-1', 'admin-1');
      expect(result).toBe(tab);
    });
  });

  // ── reject ──────────────────────────────────────────────────────────────

  describe('reject', (): void => {
    it('calls adminService.rejectTab with id, user.id, and body.notes', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.REJECTED });
      rejectTab.mockResolvedValue(tab);

      const body = { notes: 'Needs improvement' };
      const result = await controller.reject('tab-1', user, body);

      expect(rejectTab).toHaveBeenCalledWith('tab-1', 'admin-1', 'Needs improvement');
      expect(result).toBe(tab);
    });
  });
});
