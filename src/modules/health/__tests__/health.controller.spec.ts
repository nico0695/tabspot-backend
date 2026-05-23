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

import type { HealthCheckResult } from '@nestjs/terminus';

import { HealthController } from '../health.controller';
import type { PrismaHealthIndicator } from '../indicators/prisma-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: { check: jest.Mock };
  let mockPrismaHealth: PrismaHealthIndicator;

  beforeEach((): void => {
    mockHealthCheckService = {
      check: jest.fn(),
    };
    mockPrismaHealth = { isHealthy: jest.fn() } as unknown as PrismaHealthIndicator;
    controller = new HealthController(mockHealthCheckService as never, mockPrismaHealth);
  });

  describe('check (liveness)', () => {
    it('returns status ok', (): void => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    it('returns a valid ISO timestamp', (): void => {
      const result = controller.check();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('returns a non-negative uptime', (): void => {
      const result = controller.check();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ready (readiness)', () => {
    it('delegates to HealthCheckService with prisma indicator', async (): Promise<void> => {
      const expected: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      mockHealthCheckService.check.mockResolvedValue(expected);

      const result = await controller.ready();

      expect(result).toEqual(expected);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('calls prismaHealth.isHealthy when health check executes indicators', async (): Promise<void> => {
      mockHealthCheckService.check.mockImplementation(
        async (indicators: (() => Promise<unknown>)[]): Promise<HealthCheckResult> => {
          await indicators[0]();
          return { status: 'ok', info: {}, error: {}, details: {} };
        },
      );
      (mockPrismaHealth.isHealthy as jest.Mock).mockResolvedValue({ database: { status: 'up' } });

      await controller.ready();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockPrismaHealth.isHealthy).toHaveBeenCalledWith('database');
    });
  });
});
