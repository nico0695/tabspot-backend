// Redirect the generated Prisma client to the pre-compiled CJS dist so ts-jest can load it
// (AuthGuard transitively imports PrismaService via AuthService → UserRepository).
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

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';

import type { AuthService } from '@modules/auth/auth.service';
import type { IIdentityProvider, IdentityClaims } from '@modules/auth/ports/identity-provider.port';

import { AuthGuard } from '../auth.guard';

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: User;
}

function makeContext(headers: Record<string, string | undefined> = {}): {
  ctx: ExecutionContext;
  request: MockRequest;
} {
  const request: MockRequest = { headers };
  const ctx = {
    switchToHttp: (): { getRequest: () => MockRequest } => ({
      getRequest: (): MockRequest => request,
    }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('AuthGuard', () => {
  let idp: { verifyToken: jest.Mock };
  let auth: { syncUser: jest.Mock };
  let guard: AuthGuard;

  beforeEach((): void => {
    idp = { verifyToken: jest.fn() };
    auth = { syncUser: jest.fn() };
    guard = new AuthGuard(idp as unknown as IIdentityProvider, auth as unknown as AuthService);
  });

  it('throws INVALID_BEARER when Authorization header is missing', async (): Promise<void> => {
    const { ctx } = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'INVALID_BEARER' },
    });
    expect(idp.verifyToken).not.toHaveBeenCalled();
  });

  it('throws INVALID_BEARER when Authorization header uses Basic scheme', async (): Promise<void> => {
    const { ctx } = makeContext({ authorization: 'Basic abc123' });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'INVALID_BEARER' },
    });
    expect(idp.verifyToken).not.toHaveBeenCalled();
  });

  it('throws INVALID_BEARER when Authorization header is "Bearer " with no token', async (): Promise<void> => {
    const { ctx } = makeContext({ authorization: 'Bearer ' });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'INVALID_BEARER' },
    });
  });

  it('propagates UnauthorizedException when verifyToken throws', async (): Promise<void> => {
    const { ctx } = makeContext({ authorization: 'Bearer xxx' });
    idp.verifyToken.mockRejectedValue(
      new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expired' }),
    );
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'TOKEN_EXPIRED' },
    });
    expect(auth.syncUser).not.toHaveBeenCalled();
  });

  it('on success: verifies token, syncs user, attaches request.user, returns true', async (): Promise<void> => {
    const { ctx, request } = makeContext({ authorization: 'Bearer my.jwt.token' });
    const claims: IdentityClaims = {
      sub: 'sub-123',
      email: 'a@b.com',
      displayName: 'A B',
      emailConfirmed: true,
      exp: 9999999999,
    };
    const user = { id: 'u1', email: 'a@b.com', role: 'USER' } as unknown as User;
    idp.verifyToken.mockResolvedValue(claims);
    auth.syncUser.mockResolvedValue(user);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(idp.verifyToken).toHaveBeenCalledTimes(1);
    expect(idp.verifyToken).toHaveBeenCalledWith('my.jwt.token');
    expect(auth.syncUser).toHaveBeenCalledTimes(1);
    expect(auth.syncUser).toHaveBeenCalledWith({
      sub: 'sub-123',
      email: 'a@b.com',
      displayName: 'A B',
    });
    expect(request.user).toBe(user);
  });
});
