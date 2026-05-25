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
import type {
  AdminTabRow,
  ITabRepository,
  PaginatedResult,
  TabWithAuthor,
} from '../ports/tab-repository.port';
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
  let findAdminById: jest.Mock;
  let findById: jest.Mock;
  let findByUser: jest.Mock;
  let create: jest.Mock;
  let updateContent: jest.Mock;
  let updateStatus: jest.Mock;
  let softDelete: jest.Mock;
  let createExecute: jest.Mock;
  let submitExecute: jest.Mock;
  let publishExecute: jest.Mock;
  let rejectExecute: jest.Mock;
  let service: TabsService;

  beforeEach((): void => {
    findAdminById = jest.fn();
    findById = jest.fn();
    findByUser = jest.fn();
    create = jest.fn();
    updateContent = jest.fn();
    updateStatus = jest.fn();
    softDelete = jest.fn();
    createExecute = jest.fn();
    submitExecute = jest.fn();
    publishExecute = jest.fn();
    rejectExecute = jest.fn();

    const repo = {
      findAdminById,
      findById,
      findByUser,
      create,
      updateContent,
      updateStatus,
      softDelete,
      findPublished: jest.fn(),
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

  // ── createAdminTab ─────────────────────────────────────────────────────

  describe('createAdminTab', (): void => {
    it('creates admin tab as DRAFT by default', async (): Promise<void> => {
      const created = makeTab();
      create.mockResolvedValue(created);

      const result = await service.createAdminTab(
        {
          songId: 'song-1',
          content: 'content',
          tabType: 'CHORDS',
          instrument: 'GUITAR',
          difficulty: 'BEGINNER',
        },
        'admin-1',
      );

      expect(result).toBe(created);
      expect(create).toHaveBeenCalledWith({
        songId: 'song-1',
        authorUserId: 'admin-1',
        content: 'content',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
        titleOverride: undefined,
        status: TabStatus.DRAFT,
        submittedAt: null,
        publishedAt: null,
        moderatedByUserId: null,
        moderationNotes: null,
      });
    });

    it('normalizes PUBLISHED status metadata on admin create', async (): Promise<void> => {
      const created = makeTab({ status: TabStatus.PUBLISHED });
      create.mockResolvedValue(created);

      await service.createAdminTab(
        {
          songId: 'song-1',
          content: 'content',
          tabType: 'CHORDS',
          instrument: 'GUITAR',
          difficulty: 'BEGINNER',
          status: TabStatus.PUBLISHED,
          moderationNotes: 'ignored',
        },
        'admin-1',
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TabStatus.PUBLISHED,
          moderatedByUserId: 'admin-1',
          moderationNotes: null,
          submittedAt: expect.any(Date) as Date,
          publishedAt: expect.any(Date) as Date,
        }),
      );
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

  // ── updateAdminTab ─────────────────────────────────────────────────────

  describe('updateAdminTab', (): void => {
    it('throws NotFoundException when admin tab does not exist', async (): Promise<void> => {
      findAdminById.mockResolvedValue(null);

      await expect(service.updateAdminTab('missing', {}, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates content fields without status mutation', async (): Promise<void> => {
      const existing = makeAdminTab();
      const updated = makeTab({ content: 'new content' });
      findAdminById.mockResolvedValue(existing);
      updateContent.mockResolvedValue(updated);

      const result = await service.updateAdminTab('tab-1', { content: 'new content' }, 'admin-1');

      expect(result).toBe(updated);
      expect(updateContent).toHaveBeenCalledWith('tab-1', { content: 'new content' });
      expect(updateStatus).not.toHaveBeenCalled();
    });

    it('updates moderationNotes through content update when status is unchanged', async (): Promise<void> => {
      const existing = makeAdminTab();
      const updated = makeTab({ moderationNotes: 'Kept note' });
      findAdminById.mockResolvedValue(existing);
      updateContent.mockResolvedValue(updated);

      await service.updateAdminTab('tab-1', { moderationNotes: 'Kept note' }, 'admin-1');

      expect(updateContent).toHaveBeenCalledWith('tab-1', { moderationNotes: 'Kept note' });
      expect(updateStatus).not.toHaveBeenCalled();
    });

    it('normalizes REJECTED status metadata on admin update', async (): Promise<void> => {
      const existing = makeAdminTab();
      const statusUpdated = makeTab({ status: TabStatus.REJECTED });
      findAdminById.mockResolvedValue(existing);
      updateStatus.mockResolvedValue(statusUpdated);

      const result = await service.updateAdminTab(
        'tab-1',
        { status: TabStatus.REJECTED, moderationNotes: 'Needs work' },
        'admin-1',
      );

      expect(result).toBe(statusUpdated);
      expect(updateStatus).toHaveBeenCalledWith('tab-1', TabStatus.REJECTED, {
        submittedAt: expect.any(Date) as Date,
        publishedAt: null,
        moderatedByUserId: 'admin-1',
        moderationNotes: 'Needs work',
      });
    });

    it('applies content update before status normalization when both are present', async (): Promise<void> => {
      const existing = makeAdminTab();
      const contentUpdated = makeTab({ content: 'new content' });
      const finalUpdated = makeTab({ content: 'new content', status: TabStatus.PENDING });
      findAdminById.mockResolvedValue(existing);
      updateContent.mockResolvedValue(contentUpdated);
      updateStatus.mockResolvedValue(finalUpdated);

      const result = await service.updateAdminTab(
        'tab-1',
        { content: 'new content', status: TabStatus.PENDING },
        'admin-1',
      );

      expect(result).toBe(finalUpdated);
      expect(updateContent).toHaveBeenCalledWith('tab-1', { content: 'new content' });
      expect(updateStatus).toHaveBeenCalledWith('tab-1', TabStatus.PENDING, {
        submittedAt: expect.any(Date) as Date,
        publishedAt: null,
        moderatedByUserId: null,
        moderationNotes: null,
      });
    });
  });

  // ── softDeleteAdminTab ────────────────────────────────────────────────

  describe('softDeleteAdminTab', (): void => {
    it('soft-deletes an admin tab regardless of owner', async (): Promise<void> => {
      findAdminById.mockResolvedValue(makeAdminTab({ authorUserId: 'other-user' }));
      softDelete.mockResolvedValue(undefined);

      await service.softDeleteAdminTab('tab-1');

      expect(findAdminById).toHaveBeenCalledWith('tab-1');
      expect(softDelete).toHaveBeenCalledWith('tab-1');
    });

    it('throws NotFoundException when admin tab does not exist', async (): Promise<void> => {
      findAdminById.mockResolvedValue(null);

      await expect(service.softDeleteAdminTab('missing')).rejects.toThrow(NotFoundException);
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
