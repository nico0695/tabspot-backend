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

import { HttpStatus, RequestMethod } from '@nestjs/common';

import { ROLES_METADATA_KEY } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { User } from '@src/generated/prisma/client';
import { Difficulty, Instrument, TabStatus, TabType, UserRole } from '@src/generated/prisma/client';

import { AdminBulkImportController } from '../admin-bulk-import.controller';
import type { BulkImportInput } from '../../dto/requests/bulk-import-request.schema';
import type { BulkImportResponse } from '../../dto/responses/bulk-import-response.schema';
import type { BulkImportService } from '../../services/bulk-import.service';

function getBulkImportHandler(): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    AdminBulkImportController.prototype,
    'bulkImport',
  );
  if (descriptor?.value === undefined) {
    throw new Error('bulkImport handler not found on AdminBulkImportController');
  }
  return descriptor.value as object;
}

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

function makeInput(): BulkImportInput {
  return {
    artist: { name: 'Almafuerte' },
    defaults: {
      status: TabStatus.DRAFT,
      difficulty: Difficulty.INTERMEDIATE,
      instrument: Instrument.GUITAR,
    },
    songs: [
      {
        title: 'Cosas que pasan',
        versions: [{ content: '{title: Test}\n[C]Hello', tabType: TabType.CHORDS }],
      },
    ],
  };
}

describe('AdminBulkImportController', (): void => {
  let bulkImport: jest.Mock;
  let controller: AdminBulkImportController;
  let user: User;

  beforeEach((): void => {
    bulkImport = jest.fn();
    const service = { bulkImport } as unknown as BulkImportService;
    controller = new AdminBulkImportController(service);
    user = makeUser();
  });

  // ── AC1.1 — route, guards, roles, status code ───────────────────────────

  describe('route metadata (AC1.1)', (): void => {
    it('is mounted at admin/tabs with URI version 1', (): void => {
      expect(Reflect.getMetadata('path', AdminBulkImportController)).toBe('admin/tabs');
      expect(Reflect.getMetadata('__version__', AdminBulkImportController)).toBe('1');
    });

    it('exposes POST bulk-import', (): void => {
      const handler = getBulkImportHandler();

      expect(Reflect.getMetadata('path', handler)).toBe('bulk-import');
      expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.POST);
    });

    it('responds 200 (not the POST default 201)', (): void => {
      const handler = getBulkImportHandler();

      expect(Reflect.getMetadata('__httpCode__', handler)).toBe(HttpStatus.OK);
    });

    it('is guarded by AuthGuard + RolesGuard and restricted to ADMIN', (): void => {
      expect(Reflect.getMetadata('__guards__', AdminBulkImportController)).toEqual([
        AuthGuard,
        RolesGuard,
      ]);
      expect(Reflect.getMetadata(ROLES_METADATA_KEY, AdminBulkImportController)).toEqual([
        UserRole.ADMIN,
      ]);
    });
  });

  // ── delegation and response passthrough (AC1.1 / AC1.4) ─────────────────

  describe('bulkImport', (): void => {
    it('delegates to the service with the parsed body and user.id', async (): Promise<void> => {
      const response: BulkImportResponse = {
        inserted: { artists: 0, songs: 1, tabs: 1 },
        skipped: 0,
        results: [
          {
            title: 'Cosas que pasan',
            songStatus: 'created',
            songId: 'b3b0c4e2-1111-4222-8333-444455556666',
            tabsInserted: 1,
            tabsSkipped: 0,
          },
        ],
        errors: [],
      };
      bulkImport.mockResolvedValue(response);
      const body = makeInput();

      const result = await controller.bulkImport(user, body);

      expect(bulkImport).toHaveBeenCalledWith(body, 'admin-1');
      expect(result).toBe(response);
    });

    it('passes the service response through untouched, including errors[]', async (): Promise<void> => {
      const response: BulkImportResponse = {
        inserted: { artists: 0, songs: 0, tabs: 0 },
        skipped: 0,
        results: [],
        errors: [
          {
            index: 0,
            title: 'Cosas que pasan',
            code: 'SONG_PERSIST_FAILED',
            message: 'boom',
          },
        ],
      };
      bulkImport.mockResolvedValue(response);

      const result = await controller.bulkImport(user, makeInput());

      expect(result).toBe(response);
    });
  });
});
