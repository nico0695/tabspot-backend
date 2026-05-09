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

import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { ITabRepository } from '../../ports/tab-repository.port';
import { CreateTabUseCase } from '../create-tab.use-case';

const baseInput = {
  songId: 'song-1',
  authorUserId: 'user-1',
  content: '[G]Hello [C]World',
  tabType: 'CHORDS',
  instrument: 'GUITAR',
  difficulty: 'BEGINNER',
};

describe('CreateTabUseCase', () => {
  let createMock: jest.Mock;
  let useCase: CreateTabUseCase;

  beforeEach((): void => {
    createMock = jest.fn();
    const repo = {
      findById: jest.fn(),
      findPublished: jest.fn(),
      findByUser: jest.fn(),
      create: createMock,
      updateStatus: jest.fn(),
      updateContent: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as ITabRepository;
    useCase = new CreateTabUseCase(repo);
  });

  it('calls repo.create and returns the created tab', async (): Promise<void> => {
    const createdTab = { id: 'tab-1', status: TabStatus.DRAFT, ...baseInput } as unknown as Tab;
    createMock.mockResolvedValue(createdTab);

    const result = await useCase.execute(baseInput);

    expect(result).toBe(createdTab);
    expect(createMock).toHaveBeenCalledWith({
      ...baseInput,
      titleOverride: undefined,
    });
  });

  it('passes titleOverride when provided', async (): Promise<void> => {
    const input = { ...baseInput, titleOverride: 'Custom Title' };
    const createdTab = { id: 'tab-1', status: TabStatus.DRAFT } as unknown as Tab;
    createMock.mockResolvedValue(createdTab);

    await useCase.execute(input);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ titleOverride: 'Custom Title' }),
    );
  });
});
