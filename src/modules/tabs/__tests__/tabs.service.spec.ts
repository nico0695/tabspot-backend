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

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { TabsService } from '../tabs.service';
import type { ITabRepository, PaginatedResult, TabWithAuthor } from '../ports/tab-repository.port';
import type { CreateTabUseCase } from '../use-cases/create-tab.use-case';
import type { SubmitTabUseCase } from '../use-cases/submit-tab.use-case';
import type { PublishTabUseCase } from '../use-cases/publish-tab.use-case';
import type { RejectTabUseCase } from '../use-cases/reject-tab.use-case';

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

describe('TabsService', (): void => {
  let findById: jest.Mock;
  let findByUser: jest.Mock;
  let updateContent: jest.Mock;
  let softDelete: jest.Mock;
  let createExecute: jest.Mock;
  let submitExecute: jest.Mock;
  let publishExecute: jest.Mock;
  let rejectExecute: jest.Mock;
  let service: TabsService;

  beforeEach((): void => {
    findById = jest.fn();
    findByUser = jest.fn();
    updateContent = jest.fn();
    softDelete = jest.fn();
    createExecute = jest.fn();
    submitExecute = jest.fn();
    publishExecute = jest.fn();
    rejectExecute = jest.fn();

    const repo = {
      findById,
      findByUser,
      updateContent,
      softDelete,
      findPublished: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as ITabRepository;

    const createUC = { execute: createExecute } as unknown as CreateTabUseCase;
    const submitUC = { execute: submitExecute } as unknown as SubmitTabUseCase;
    const publishUC = { execute: publishExecute } as unknown as PublishTabUseCase;
    const rejectUC = { execute: rejectExecute } as unknown as RejectTabUseCase;

    service = new TabsService(repo, createUC, submitUC, publishUC, rejectUC);
  });

  // ── updateTab ─────────────────────────────────────────────────────────

  describe('updateTab', (): void => {
    const updateData = { content: 'new content' };

    it('updates a DRAFT tab owned by the user', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.DRAFT });
      const updated = makeTab({ ...tab, content: 'new content' });

      findById.mockResolvedValue(tab);
      updateContent.mockResolvedValue(updated);

      const result = await service.updateTab('tab-1', 'user-1', updateData);

      expect(result).toBe(updated);
      expect(findById).toHaveBeenCalledWith('tab-1');
      expect(updateContent).toHaveBeenCalledWith('tab-1', updateData);
    });

    it('updates a REJECTED tab owned by the user', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.REJECTED });
      const updated = makeTab({ ...tab, content: 'new content' });

      findById.mockResolvedValue(tab);
      updateContent.mockResolvedValue(updated);

      const result = await service.updateTab('tab-1', 'user-1', updateData);

      expect(result).toBe(updated);
      expect(updateContent).toHaveBeenCalledWith('tab-1', updateData);
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.updateTab('missing', 'user-1', updateData)).rejects.toThrow(
        NotFoundException,
      );
      expect(updateContent).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user does not own the tab', async (): Promise<void> => {
      const tab = makeTab({ authorUserId: 'other-user' });
      findById.mockResolvedValue(tab);

      await expect(service.updateTab('tab-1', 'user-1', updateData)).rejects.toThrow(
        ForbiddenException,
      );
      expect(updateContent).not.toHaveBeenCalled();
    });

    it('throws ConflictException when tab status is PENDING', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PENDING });
      findById.mockResolvedValue(tab);

      await expect(service.updateTab('tab-1', 'user-1', updateData)).rejects.toThrow(
        ConflictException,
      );
      expect(updateContent).not.toHaveBeenCalled();
    });

    it('throws ConflictException when tab status is PUBLISHED', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PUBLISHED });
      findById.mockResolvedValue(tab);

      await expect(service.updateTab('tab-1', 'user-1', updateData)).rejects.toThrow(
        ConflictException,
      );
      expect(updateContent).not.toHaveBeenCalled();
    });
  });

  // ── softDeleteTab ─────────────────────────────────────────────────────

  describe('softDeleteTab', (): void => {
    it('soft-deletes a tab owned by the user', async (): Promise<void> => {
      const tab = makeTab();
      findById.mockResolvedValue(tab);
      softDelete.mockResolvedValue(undefined);

      await service.softDeleteTab('tab-1', 'user-1');

      expect(findById).toHaveBeenCalledWith('tab-1');
      expect(softDelete).toHaveBeenCalledWith('tab-1');
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.softDeleteTab('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user does not own the tab', async (): Promise<void> => {
      const tab = makeTab({ authorUserId: 'other-user' });
      findById.mockResolvedValue(tab);

      await expect(service.softDeleteTab('tab-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(softDelete).not.toHaveBeenCalled();
    });
  });

  // ── createTab (delegation) ────────────────────────────────────────────

  describe('createTab', (): void => {
    it('delegates to createTabUseCase.execute', async (): Promise<void> => {
      const input = {
        songId: 'song-1',
        authorUserId: 'user-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
      };
      const tab = makeTab();
      createExecute.mockResolvedValue(tab);

      const result = await service.createTab(input);

      expect(result).toBe(tab);
      expect(createExecute).toHaveBeenCalledWith(input);
    });
  });

  // ── submitTab (delegation) ────────────────────────────────────────────

  describe('submitTab', (): void => {
    it('delegates to submitTabUseCase.execute', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PENDING });
      submitExecute.mockResolvedValue(tab);

      const result = await service.submitTab('tab-1', 'user-1');

      expect(result).toBe(tab);
      expect(submitExecute).toHaveBeenCalledWith('tab-1', 'user-1');
    });
  });

  // ── listUserTabs (delegation) ─────────────────────────────────────────

  describe('listUserTabs', (): void => {
    it('delegates to tabRepository.findByUser', async (): Promise<void> => {
      const params = { limit: 10 };
      const paginated: PaginatedResult<Tab> = {
        items: [makeTab()],
        nextCursor: null,
        hasMore: false,
      };
      findByUser.mockResolvedValue(paginated);

      const result = await service.listUserTabs('user-1', params);

      expect(result).toBe(paginated);
      expect(findByUser).toHaveBeenCalledWith('user-1', params);
    });
  });

  // ── findPublicDetail ──────────────────────────────────────────────────

  describe('findPublicDetail', (): void => {
    it('returns a PUBLISHED tab for anonymous user', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PUBLISHED });
      findById.mockResolvedValue(tab);

      const result = await service.findPublicDetail('tab-1');

      expect(result).toBe(tab);
      expect(findById).toHaveBeenCalledWith('tab-1');
    });

    it('returns a PUBLISHED tab for logged-in non-owner non-admin user', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.PUBLISHED, authorUserId: 'other-user' });
      findById.mockResolvedValue(tab);
      const user = makeUser({ id: 'user-1', role: 'USER' });

      const result = await service.findPublicDetail('tab-1', user);

      expect(result).toBe(tab);
    });

    it('throws NotFoundException for DRAFT tab with no user (anonymous)', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.DRAFT });
      findById.mockResolvedValue(tab);

      await expect(service.findPublicDetail('tab-1')).rejects.toThrow(NotFoundException);
    });

    it('returns a DRAFT tab when user is the owner', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.DRAFT, authorUserId: 'user-1' });
      findById.mockResolvedValue(tab);
      const user = makeUser({ id: 'user-1' });

      const result = await service.findPublicDetail('tab-1', user);

      expect(result).toBe(tab);
    });

    it('returns a DRAFT tab when user is an admin', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.DRAFT, authorUserId: 'other-user' });
      findById.mockResolvedValue(tab);
      const user = makeUser({ id: 'admin-1', role: 'ADMIN' });

      const result = await service.findPublicDetail('tab-1', user);

      expect(result).toBe(tab);
    });

    it('throws NotFoundException for DRAFT tab when user is not owner and not admin', async (): Promise<void> => {
      const tab = makeTab({ status: TabStatus.DRAFT, authorUserId: 'other-user' });
      findById.mockResolvedValue(tab);
      const user = makeUser({ id: 'user-1', role: 'USER' });

      await expect(service.findPublicDetail('tab-1', user)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.findPublicDetail('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for soft-deleted tab even when user is the owner', async (): Promise<void> => {
      const tab = makeTab({
        status: TabStatus.PUBLISHED,
        authorUserId: 'user-1',
        deletedAt: new Date('2026-03-01'),
      });
      findById.mockResolvedValue(tab);
      const user = makeUser({ id: 'user-1' });

      await expect(service.findPublicDetail('tab-1', user)).rejects.toThrow(NotFoundException);
    });
  });
});
