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

import type { User } from '@src/generated/prisma/client';

import { AdminUsersController } from '../admin-users.controller';
import type { AdminService } from '../../services/admin.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'admin-1',
    supabaseAuthId: 'sup-1',
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    blockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('AdminUsersController', (): void => {
  let listUsers: jest.Mock;
  let changeUserRole: jest.Mock;
  let controller: AdminUsersController;
  let user: User;

  beforeEach((): void => {
    listUsers = jest.fn();
    changeUserRole = jest.fn();

    const adminService = {
      listUsers,
      changeUserRole,
    } as unknown as AdminService;

    controller = new AdminUsersController(adminService);
    user = makeUser();
  });

  // ── list ────────────────────────────────────────────────────────────────

  describe('list', (): void => {
    it('calls adminService.listUsers and returns offset paginated response', async (): Promise<void> => {
      const targetUser = makeUser({ id: 'user-1', role: 'USER' });
      listUsers.mockResolvedValue({ items: [targetUser], totalCount: 1 });

      const query = { page: 1, pageSize: 20 };
      const result = await controller.list(query);

      expect(listUsers).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: [targetUser],
        pageInfo: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      });
    });

    it('calculates totalPages correctly for multiple pages', async (): Promise<void> => {
      listUsers.mockResolvedValue({ items: [], totalCount: 55 });

      const query = { page: 3, pageSize: 20 };
      const result = await controller.list(query);

      expect(result.pageInfo).toEqual({
        page: 3,
        pageSize: 20,
        totalCount: 55,
        totalPages: 3,
      });
    });
  });

  // ── changeRole ──────────────────────────────────────────────────────────

  describe('changeRole', (): void => {
    it('calls adminService.changeUserRole with id, body.role, and user.id', async (): Promise<void> => {
      const updated = makeUser({ id: 'target-1', role: 'USER' });
      changeUserRole.mockResolvedValue(updated);

      const body = { role: 'USER' as const };
      const result = await controller.changeRole('target-1', user, body);

      expect(changeUserRole).toHaveBeenCalledWith('target-1', 'USER', 'admin-1');
      expect(result).toBe(updated);
    });
  });
});
