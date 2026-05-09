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

import { TabStatus } from '@src/generated/prisma/client';

import { canTransition, TAB_STATUS_TRANSITIONS } from '../../constants/tab-status-transitions';

const ALL_STATUSES = Object.values(TabStatus);

describe('TAB_STATUS_TRANSITIONS', () => {
  it('defines transitions for every TabStatus', (): void => {
    for (const status of ALL_STATUSES) {
      expect(TAB_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });
});

describe('canTransition', () => {
  const validCases: [TabStatus, TabStatus][] = [
    [TabStatus.DRAFT, TabStatus.PENDING],
    [TabStatus.PENDING, TabStatus.PUBLISHED],
    [TabStatus.PENDING, TabStatus.REJECTED],
    [TabStatus.REJECTED, TabStatus.PENDING],
  ];

  const invalidCases: [TabStatus, TabStatus][] = [];
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const isValid = validCases.some(([vf, vt]) => vf === from && vt === to);
      if (!isValid) {
        invalidCases.push([from, to]);
      }
    }
  }

  it.each(validCases)('%s → %s should be allowed', (from, to): void => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(invalidCases)('%s → %s should be forbidden', (from, to): void => {
    expect(canTransition(from, to)).toBe(false);
  });
});
