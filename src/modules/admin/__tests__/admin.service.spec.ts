jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
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

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { AdminService } from '../services/admin.service';
import type { TabsService } from '@modules/tabs/tabs.service';
import type { ITabRepository, TabWithAuthor } from '@modules/tabs/ports/tab-repository.port';
import type { UserRepository } from '@modules/auth/repositories/user.repository';

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

describe('AdminService', (): void => {
  let findAllAdmin: jest.Mock;
  let countByStatus: jest.Mock;
  let countCreatedSince: jest.Mock;
  let publishTab: jest.Mock;
  let rejectTab: jest.Mock;
  let listPaginated: jest.Mock;
  let findById: jest.Mock;
  let updateRole: jest.Mock;
  let countAll: jest.Mock;
  let service: AdminService;

  beforeEach((): void => {
    findAllAdmin = jest.fn();
    countByStatus = jest.fn();
    countCreatedSince = jest.fn();
    publishTab = jest.fn();
    rejectTab = jest.fn();
    listPaginated = jest.fn();
    findById = jest.fn();
    updateRole = jest.fn();
    countAll = jest.fn();

    const mockTabsService = {
      publishTab,
      rejectTab,
    } as unknown as TabsService;

    const mockTabRepo = {
      findAllAdmin,
      countByStatus,
      countCreatedSince,
    } as unknown as ITabRepository;

    const mockUserRepo = {
      listPaginated,
      findById,
      updateRole,
      countAll,
    } as unknown as UserRepository;

    service = new AdminService(mockTabsService, mockTabRepo, mockUserRepo);
  });

  // ── listTabs ──────────────────────────────────────────────────────────────

  describe('listTabs', (): void => {
    it('delegates to tabRepository.findAllAdmin', async (): Promise<void> => {
      const filters = { page: 1, pageSize: 20 };
      const result = { items: [makeTab()], totalCount: 1 };
      findAllAdmin.mockResolvedValue(result);

      const response = await service.listTabs(filters);

      expect(response).toBe(result);
      expect(findAllAdmin).toHaveBeenCalledWith(filters);
    });
  });

  // ── publishTab ────────────────────────────────────────────────────────────

  describe('publishTab', (): void => {
    it('delegates to tabsService.publishTab', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PUBLISHED });
      publishTab.mockResolvedValue(tab);

      const result = await service.publishTab('tab-1', 'mod-1');

      expect(result).toBe(tab);
      expect(publishTab).toHaveBeenCalledWith('tab-1', 'mod-1');
    });
  });

  // ── rejectTab ─────────────────────────────────────────────────────────────

  describe('rejectTab', (): void => {
    it('delegates to tabsService.rejectTab', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.REJECTED });
      rejectTab.mockResolvedValue(tab);

      const result = await service.rejectTab('tab-1', 'mod-1', 'Needs work');

      expect(result).toBe(tab);
      expect(rejectTab).toHaveBeenCalledWith('tab-1', 'mod-1', 'Needs work');
    });
  });

  // ── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', (): void => {
    it('delegates to userRepository.listPaginated', async (): Promise<void> => {
      const params = { page: 1, pageSize: 20 };
      const result = { items: [makeUser()], totalCount: 1 };
      listPaginated.mockResolvedValue(result);

      const response = await service.listUsers(params);

      expect(response).toBe(result);
      expect(listPaginated).toHaveBeenCalledWith(params);
    });
  });

  // ── changeUserRole ────────────────────────────────────────────────────────

  describe('changeUserRole', (): void => {
    it('finds user and calls updateRole on happy path', async (): Promise<void> => {
      const user = makeUser({ id: 'target-1' });
      const updated = makeUser({ id: 'target-1', role: 'USER' });
      findById.mockResolvedValue(user);
      updateRole.mockResolvedValue(updated);

      const result = await service.changeUserRole('target-1', 'USER', 'admin-1');

      expect(result).toBe(updated);
      expect(findById).toHaveBeenCalledWith('target-1');
      expect(updateRole).toHaveBeenCalledWith('target-1', 'USER');
    });

    it('throws ForbiddenException with SELF_ROLE_CHANGE when targeting self', async (): Promise<void> => {
      await expect(service.changeUserRole('admin-1', 'USER', 'admin-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(findById).not.toHaveBeenCalled();
      expect(updateRole).not.toHaveBeenCalled();
    });

    it('throws NotFoundException with USER_NOT_FOUND when user does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.changeUserRole('missing-1', 'USER', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(updateRole).not.toHaveBeenCalled();
    });
  });

  // ── getDashboard ──────────────────────────────────────────────────────────

  describe('getDashboard', (): void => {
    it('calls countAll, countByStatus, and countCreatedSince in parallel', async (): Promise<void> => {
      countAll.mockResolvedValue(42);
      countByStatus.mockImplementation((status: TabStatus): Promise<number> => {
        if (status === TabStatus.PUBLISHED) return Promise.resolve(15);
        if (status === TabStatus.PENDING) return Promise.resolve(5);
        return Promise.resolve(0);
      });
      countCreatedSince.mockResolvedValue(7);

      const result = await service.getDashboard();

      expect(result).toEqual({
        totalUsers: 42,
        publishedTabs: 15,
        pendingTabs: 5,
        newTabsThisWeek: 7,
      });
      expect(countAll).toHaveBeenCalledTimes(1);
      expect(countByStatus).toHaveBeenCalledWith(TabStatus.PUBLISHED);
      expect(countByStatus).toHaveBeenCalledWith(TabStatus.PENDING);
      expect(countCreatedSince).toHaveBeenCalledTimes(1);
    });
  });
});
