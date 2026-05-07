// Redirect the generated Prisma client to the pre-compiled CJS dist so ts-jest can load it
// (the source uses import.meta.url which breaks under CJS).
jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
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

import { AuthService } from '../auth.service';
import { UserRepository } from '../repositories/user.repository';

const claims = { sub: 'sub-1', email: 'a@b.com', displayName: 'A B' };
const existingUser = { id: 'u1', email: 'a@b.com' } as unknown as User;
const newUser = { id: 'u2', email: 'a@b.com' } as unknown as User;

describe('AuthService', () => {
  let findBySupabaseAuthId: jest.Mock;
  let create: jest.Mock;
  let service: AuthService;

  beforeEach((): void => {
    findBySupabaseAuthId = jest.fn();
    create = jest.fn();
    const users = { findBySupabaseAuthId, create } as unknown as UserRepository;
    service = new AuthService(users);
  });

  it('returns the existing user without calling create when lookup hits', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValue(existingUser);

    const result = await service.syncUser(claims);

    expect(result).toBe(existingUser);
    expect(findBySupabaseAuthId).toHaveBeenCalledWith('sub-1');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates and returns a new user when lookup misses', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockResolvedValue(newUser);

    const result = await service.syncUser(claims);

    expect(result).toBe(newUser);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      supabaseAuthId: 'sub-1',
      email: 'a@b.com',
      displayName: 'A B',
    });
  });

  it('recovers from P2002 race by re-fetching the row that the parallel request inserted', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser);
    create.mockRejectedValue({ code: 'P2002', message: 'Unique violation' });

    const result = await service.syncUser(claims);

    expect(result).toBe(existingUser);
    expect(findBySupabaseAuthId).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('re-throws non-P2002 errors from create', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockRejectedValue({ code: 'P2003', message: 'FK violation' });

    await expect(service.syncUser(claims)).rejects.toMatchObject({ code: 'P2003' });
    expect(findBySupabaseAuthId).toHaveBeenCalledTimes(1);
  });

  it('re-throws original P2002 if recovery lookup also returns null (impossible state)', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockRejectedValue({ code: 'P2002', message: 'Unique violation' });

    await expect(service.syncUser(claims)).rejects.toMatchObject({ code: 'P2002' });
    expect(findBySupabaseAuthId).toHaveBeenCalledTimes(2);
  });

  it('re-throws plain (non-object) errors from create', async (): Promise<void> => {
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockRejectedValue(new Error('boom'));

    await expect(service.syncUser(claims)).rejects.toThrow('boom');
    expect(findBySupabaseAuthId).toHaveBeenCalledTimes(1);
  });
});
