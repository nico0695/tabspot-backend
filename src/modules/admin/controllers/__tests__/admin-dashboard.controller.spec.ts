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

import { AdminDashboardController } from '../admin-dashboard.controller';
import type { AdminService, DashboardData } from '../../services/admin.service';

describe('AdminDashboardController', (): void => {
  let getDashboard: jest.Mock;
  let controller: AdminDashboardController;

  beforeEach((): void => {
    getDashboard = jest.fn();

    const adminService = {
      getDashboard,
    } as unknown as AdminService;

    controller = new AdminDashboardController(adminService);
  });

  // ── dashboard ───────────────────────────────────────────────────────────

  describe('dashboard', (): void => {
    it('calls adminService.getDashboard and returns DashboardData', async (): Promise<void> => {
      const data: DashboardData = {
        totalUsers: 42,
        publishedTabs: 15,
        pendingTabs: 5,
        newTabsThisWeek: 7,
      };
      getDashboard.mockResolvedValue(data);

      const result = await controller.dashboard();

      expect(getDashboard).toHaveBeenCalledTimes(1);
      expect(result).toBe(data);
    });
  });
});
