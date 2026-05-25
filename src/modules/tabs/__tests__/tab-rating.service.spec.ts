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

import { NotFoundException } from '@nestjs/common';

import type { TabRating } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { ITabRepository, TabWithAuthor } from '../ports/tab-repository.port';
import type { TabRatingAggregateResult } from '../repositories/tab-rating.repository';
import { TabRatingRepository } from '../repositories/tab-rating.repository';
import { TabRatingService } from '../services/tab-rating.service';

function makeTabWithAuthor(overrides: Partial<TabWithAuthor> = {}): TabWithAuthor {
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
    publishedAt: new Date('2026-01-01'),
    moderatedByUserId: null,
    moderationNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    author: { displayName: 'Test User' },
    ...overrides,
  } as TabWithAuthor;
}

function makeTabRating(overrides: Partial<TabRating> = {}): TabRating {
  return {
    id: 'rating-1',
    tabId: 'tab-1',
    userId: 'user-1',
    rating: 4,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as TabRating;
}

describe('TabRatingService', (): void => {
  let findById: jest.Mock;
  let upsert: jest.Mock;
  let findByTabAndUser: jest.Mock;
  let getAggregate: jest.Mock;
  let service: TabRatingService;

  beforeEach((): void => {
    findById = jest.fn();
    upsert = jest.fn();
    findByTabAndUser = jest.fn();
    getAggregate = jest.fn();

    const tabRepo = {
      findById,
      findPublished: jest.fn(),
      findByUser: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      updateContent: jest.fn(),
      softDelete: jest.fn(),
      findAllAdmin: jest.fn(),
      countByStatus: jest.fn(),
      countCreatedSince: jest.fn(),
    } as unknown as ITabRepository;

    const ratingRepo = {
      upsert,
      findByTabAndUser,
      getAggregate,
    } as unknown as TabRatingRepository;

    service = new TabRatingService(tabRepo, ratingRepo);
  });

  // ── rateTab ──────────────────────────────────────────────────────────

  describe('rateTab', (): void => {
    it('upserts a rating for a PUBLISHED tab', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ status: TabStatus.PUBLISHED });
      const rating = makeTabRating();

      findById.mockResolvedValue(tab);
      upsert.mockResolvedValue(rating);

      const result = await service.rateTab('tab-1', 'user-1', 4);

      expect(result).toBe(rating);
      expect(findById).toHaveBeenCalledWith('tab-1');
      expect(upsert).toHaveBeenCalledWith('tab-1', 'user-1', 4);
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.rateTab('missing', 'user-1', 4)).rejects.toThrow(NotFoundException);
      expect(upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tab is soft-deleted', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ deletedAt: new Date('2026-03-01') });
      findById.mockResolvedValue(tab);

      await expect(service.rateTab('tab-1', 'user-1', 4)).rejects.toThrow(NotFoundException);
      expect(upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tab is DRAFT', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ status: TabStatus.DRAFT });
      findById.mockResolvedValue(tab);

      await expect(service.rateTab('tab-1', 'user-1', 4)).rejects.toThrow(NotFoundException);
      expect(upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tab is PENDING', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ status: TabStatus.PENDING });
      findById.mockResolvedValue(tab);

      await expect(service.rateTab('tab-1', 'user-1', 4)).rejects.toThrow(NotFoundException);
      expect(upsert).not.toHaveBeenCalled();
    });
  });

  // ── getAggregate ─────────────────────────────────────────────────────

  describe('getAggregate', (): void => {
    it('returns aggregate for a PUBLISHED tab', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ status: TabStatus.PUBLISHED });
      const aggregate: TabRatingAggregateResult = { average: 3.5, count: 10 };

      findById.mockResolvedValue(tab);
      getAggregate.mockResolvedValue(aggregate);

      const result = await service.getAggregate('tab-1');

      expect(result).toBe(aggregate);
      expect(findById).toHaveBeenCalledWith('tab-1');
      expect(getAggregate).toHaveBeenCalledWith('tab-1');
    });

    it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
      findById.mockResolvedValue(null);

      await expect(service.getAggregate('missing')).rejects.toThrow(NotFoundException);
      expect(getAggregate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tab is not PUBLISHED', async (): Promise<void> => {
      const tab = makeTabWithAuthor({ status: TabStatus.DRAFT });
      findById.mockResolvedValue(tab);

      await expect(service.getAggregate('tab-1')).rejects.toThrow(NotFoundException);
      expect(getAggregate).not.toHaveBeenCalled();
    });
  });

  // ── getUserRating ────────────────────────────────────────────────────

  describe('getUserRating', (): void => {
    it('returns the user rating when it exists', async (): Promise<void> => {
      const rating = makeTabRating();
      findByTabAndUser.mockResolvedValue(rating);

      const result = await service.getUserRating('tab-1', 'user-1');

      expect(result).toBe(rating);
      expect(findByTabAndUser).toHaveBeenCalledWith('tab-1', 'user-1');
    });

    it('throws NotFoundException when user has not rated the tab', async (): Promise<void> => {
      findByTabAndUser.mockResolvedValue(null);

      await expect(service.getUserRating('tab-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
