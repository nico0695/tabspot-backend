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
import { TabStatus, UserStatus } from '@src/generated/prisma/client';

import { AdminService } from '../services/admin.service';
import type { TabsService } from '@modules/tabs/tabs.service';
import type { AdminTabRow, ITabRepository } from '@modules/tabs/ports/tab-repository.port';
import type { UserRepository } from '@modules/auth/repositories/user.repository';
import type { CreateAdminTabInput } from '../dto/create-admin-tab.schema';
import type { UpdateAdminTabInput } from '../dto/update-admin-tab.schema';

function makeTab(overrides: Partial<Tab> = {}): AdminTabRow {
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
    ...overrides,
  } as AdminTabRow;
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
  let findAdminById: jest.Mock;
  let findAllAdmin: jest.Mock;
  let countByStatus: jest.Mock;
  let countCreatedSince: jest.Mock;
  let createAdminTab: jest.Mock;
  let updateAdminTab: jest.Mock;
  let softDeleteAdminTab: jest.Mock;
  let publishTab: jest.Mock;
  let rejectTab: jest.Mock;
  let listPaginated: jest.Mock;
  let findById: jest.Mock;
  let updateRole: jest.Mock;
  let updateStatus: jest.Mock;
  let countAll: jest.Mock;
  let service: AdminService;

  beforeEach((): void => {
    findAdminById = jest.fn();
    findAllAdmin = jest.fn();
    countByStatus = jest.fn();
    countCreatedSince = jest.fn();
    createAdminTab = jest.fn();
    updateAdminTab = jest.fn();
    softDeleteAdminTab = jest.fn();
    publishTab = jest.fn();
    rejectTab = jest.fn();
    listPaginated = jest.fn();
    findById = jest.fn();
    updateRole = jest.fn();
    updateStatus = jest.fn();
    countAll = jest.fn();

    const mockTabsService = {
      createAdminTab,
      updateAdminTab,
      softDeleteAdminTab,
      publishTab,
      rejectTab,
    } as unknown as TabsService;

    const mockTabRepo = {
      findAdminById,
      findAllAdmin,
      countByStatus,
      countCreatedSince,
    } as unknown as ITabRepository;

    const mockUserRepo = {
      listPaginated,
      findById,
      updateRole,
      updateStatus,
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

  // ── getTabById ───────────────────────────────────────────────────────────

  describe('getTabById', (): void => {
    it('returns admin tab detail when found', async (): Promise<void> => {
      const tab = makeTab();
      findAdminById.mockResolvedValue(tab);

      const result = await service.getTabById('tab-1');

      expect(result).toBe(tab);
      expect(findAdminById).toHaveBeenCalledWith('tab-1');
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findAdminById.mockResolvedValue(null);

      await expect(service.getTabById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── createTab ────────────────────────────────────────────────────────────

  describe('createTab', (): void => {
    it('delegates to tabsService.createAdminTab', async (): Promise<void> => {
      const input: CreateAdminTabInput = {
        songId: 'song-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
      };
      const created = makeTab();
      createAdminTab.mockResolvedValue(created);

      const result = await service.createTab(input, 'admin-1');

      expect(result).toBe(created);
      expect(createAdminTab).toHaveBeenCalledWith(input, 'admin-1');
    });
  });

  // ── updateTab ────────────────────────────────────────────────────────────

  describe('updateTab', (): void => {
    it('delegates to tabsService.updateAdminTab', async (): Promise<void> => {
      const input: UpdateAdminTabInput = { status: 'PUBLISHED' };
      const updated = makeTab({ status: TabStatus.PUBLISHED });
      updateAdminTab.mockResolvedValue(updated);

      const result = await service.updateTab('tab-1', input, 'admin-1');

      expect(result).toBe(updated);
      expect(updateAdminTab).toHaveBeenCalledWith('tab-1', input, 'admin-1');
    });
  });

  // ── deleteTab ────────────────────────────────────────────────────────────

  describe('deleteTab', (): void => {
    it('delegates to tabsService.softDeleteAdminTab', async (): Promise<void> => {
      softDeleteAdminTab.mockResolvedValue(undefined);

      await service.deleteTab('tab-1');

      expect(softDeleteAdminTab).toHaveBeenCalledWith('tab-1');
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

  // ── changeUserStatus ────────────────────────────────────────────────────

  describe('changeUserStatus', (): void => {
    it('finds user and calls updateStatus with BLOCKED and a timestamp', async (): Promise<void> => {
      const user = makeUser({ id: 'target-1' });
      const updated = makeUser({
        id: 'target-1',
        status: 'BLOCKED',
        blockedAt: new Date('2026-05-09T00:00:00Z'),
      });
      findById.mockResolvedValue(user);
      updateStatus.mockResolvedValue(updated);

      const result = await service.changeUserStatus('target-1', UserStatus.BLOCKED, 'admin-1');

      expect(result).toBe(updated);
      expect(findById).toHaveBeenCalledWith('target-1');
      expect(updateStatus).toHaveBeenCalledTimes(1);
      expect(updateStatus).toHaveBeenCalledWith('target-1', UserStatus.BLOCKED, expect.any(Date));
    });

    it('finds user and clears blockedAt when setting ACTIVE', async (): Promise<void> => {
      const user = makeUser({
        id: 'target-1',
        status: 'BLOCKED',
        blockedAt: new Date('2026-05-01T00:00:00Z'),
      });
      const updated = makeUser({ id: 'target-1', status: 'ACTIVE', blockedAt: null });
      findById.mockResolvedValue(user);
      updateStatus.mockResolvedValue(updated);

      const result = await service.changeUserStatus('target-1', UserStatus.ACTIVE, 'admin-1');

      expect(result).toBe(updated);
      expect(updateStatus).toHaveBeenCalledWith('target-1', UserStatus.ACTIVE, null);
    });

    it('throws ForbiddenException with SELF_STATUS_CHANGE when targeting self', async (): Promise<void> => {
      await expect(
        service.changeUserStatus('admin-1', UserStatus.BLOCKED, 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(findById).not.toHaveBeenCalled();
      expect(updateStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundException with USER_NOT_FOUND when user does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(
        service.changeUserStatus('missing-1', UserStatus.BLOCKED, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
      expect(updateStatus).not.toHaveBeenCalled();
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
