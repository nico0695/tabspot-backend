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

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { ITabRepository } from '../../ports/tab-repository.port';
import { SubmitTabUseCase } from '../submit-tab.use-case';

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: 'tab-1',
    songId: 'song-1',
    authorUserId: 'user-1',
    content: '[G]Hello',
    tabType: 'CHORDS' as Tab['tabType'],
    instrument: 'GUITAR' as Tab['instrument'],
    difficulty: 'BEGINNER' as Tab['difficulty'],
    status: TabStatus.DRAFT,
    titleOverride: null,
    submittedAt: null,
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

describe('SubmitTabUseCase', () => {
  let findByIdMock: jest.Mock;
  let updateStatusMock: jest.Mock;
  let useCase: SubmitTabUseCase;

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
    useCase = new SubmitTabUseCase(repo);
  });

  it('transitions DRAFT → PENDING', async (): Promise<void> => {
    const tab = makeTab({ status: TabStatus.DRAFT });
    const updatedTab = makeTab({ status: TabStatus.PENDING });
    findByIdMock.mockResolvedValue(tab);
    updateStatusMock.mockResolvedValue(updatedTab);

    const result = await useCase.execute('tab-1', 'user-1');

    expect(result).toBe(updatedTab);
    expect(updateStatusMock).toHaveBeenCalledWith('tab-1', TabStatus.PENDING, {
      submittedAt: expect.any(Date) as Date,
    });
  });

  it('transitions REJECTED → PENDING (re-submit)', async (): Promise<void> => {
    const tab = makeTab({ status: TabStatus.REJECTED });
    const updatedTab = makeTab({ status: TabStatus.PENDING });
    findByIdMock.mockResolvedValue(tab);
    updateStatusMock.mockResolvedValue(updatedTab);

    const result = await useCase.execute('tab-1', 'user-1');

    expect(result).toBe(updatedTab);
  });

  it('throws NotFoundException when tab does not exist', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(null);

    await expect(useCase.execute('tab-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when user does not own the tab', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ authorUserId: 'other-user' }));

    await expect(useCase.execute('tab-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws ConflictException for PENDING → PENDING', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ status: TabStatus.PENDING }));

    await expect(useCase.execute('tab-1', 'user-1')).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException for PUBLISHED → PENDING', async (): Promise<void> => {
    findByIdMock.mockResolvedValue(makeTab({ status: TabStatus.PUBLISHED }));

    await expect(useCase.execute('tab-1', 'user-1')).rejects.toThrow(ConflictException);
  });
});
