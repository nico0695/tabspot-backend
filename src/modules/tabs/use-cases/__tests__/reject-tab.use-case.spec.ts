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

import { ConflictException, NotFoundException } from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { ITabRepository } from '../../ports/tab-repository.port';
import { RejectTabUseCase } from '../reject-tab.use-case';

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    songId: 'song-1',
    authorUserId: 'user-1',
    content: '[G]Hello',
    tabType: 'CHORDS' as Tab['tabType'],
    instrument: 'GUITAR' as Tab['instrument'],
    difficulty: 'BEGINNER' as Tab['difficulty'],
    status: TabStatus.PENDING,
    titleOverride: null,
    submittedAt: new Date(),
    publishedAt: null,
    moderatedByUserId: null,
    moderationNotes: null,
    versionNumber: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Tab;
}

describe('RejectTabUseCase', () => {
  let findByIdMock: jest.Mock;
  let updateStatusMock: jest.Mock;
  let useCase: RejectTabUseCase;

  beforeEach((): void => {
    findByIdMock = jest.fn();
    updateStatusMock = jest.fn();
    const repo = {
      findById: findByIdMock,
      findPublished: jest.fn(),
      findByUser: jest.fn(),
      create: jest.fn(),
      updateStatus: updateStatusMock,
      updateContent: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as ITabRepository;
    useCase = new RejectTabUseCase(repo);
  });

  it('transitions PENDING → REJECTED', async (): Promise<void> => {
    const tab = makeTab({ status: TabStatus.PENDING });
    const rejectedTab = makeTab({ status: TabStatus.REJECTED });
    findByIdMock.mockResolvedValue(tab);
    updateStatusMock.mockResolvedValue(rejectedTab);

    const result = await useCase.execute('tab-1', 'admin-1', 'Needs better formatting');

    expect(result).toBe(rejectedTab);
    expect(updateStatusMock).toHaveBeenCalledWith('tab-1', TabStatus.REJECTED, {
      moderatedByUserId: 'admin-1',
      moderationNotes: 'Needs better formatting',
    });
  });

  it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(null);

    await expect(useCase.execute('tab-1', 'admin-1', 'notes')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException for DRAFT → REJECTED', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ status: TabStatus.DRAFT }));

    await expect(useCase.execute('tab-1', 'admin-1', 'notes')).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException for PUBLISHED → REJECTED', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ status: TabStatus.PUBLISHED }));

    await expect(useCase.execute('tab-1', 'admin-1', 'notes')).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException for REJECTED → REJECTED', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ status: TabStatus.REJECTED }));

    await expect(useCase.execute('tab-1', 'admin-1', 'notes')).rejects.toThrow(ConflictException);
  });
});
