jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client.js');
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

import { HealthCheckError } from '@nestjs/terminus';

import { PrismaHealthIndicator } from '../indicators/prisma-health.indicator';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let mockPrisma: { $queryRaw: jest.Mock };

  beforeEach((): void => {
    mockPrisma = { $queryRaw: jest.fn() };
    indicator = new PrismaHealthIndicator(mockPrisma as never);
  });

  it('returns status up when database is reachable', async (): Promise<void> => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws HealthCheckError when database is unreachable', async (): Promise<void> => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
  });

  it('includes error message in health check error details', async (): Promise<void> => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    try {
      await indicator.isHealthy('database');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const healthError = error as HealthCheckError;
      expect(healthError.causes).toEqual({
        database: { status: 'down', message: 'Connection refused' },
      });
    }
  });

  it('handles non-Error thrown values', async (): Promise<void> => {
    mockPrisma.$queryRaw.mockRejectedValue('unknown failure');

    try {
      await indicator.isHealthy('database');
      fail('Expected HealthCheckError');
    } catch (error) {
      expect(error).toBeInstanceOf(HealthCheckError);
      const healthError = error as HealthCheckError;
      expect(healthError.causes).toEqual({
        database: { status: 'down', message: 'Database unreachable' },
      });
    }
  });
});
