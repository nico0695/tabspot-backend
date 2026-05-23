// Redirect the generated Prisma client to the pre-compiled CJS dist so ts-jest can load it.
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

import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';

import type { AuthService } from '@modules/auth/auth.service';
import type { IIdentityProvider, IdentityClaims } from '@modules/auth/ports/identity-provider.port';

import { OptionalAuthGuard } from '../optional-auth.guard';

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

describe('OptionalAuthGuard', () => {
  let idp: { verifyToken: jest.Mock };
  let auth: { resolveActiveUser: jest.Mock };
  let guard: OptionalAuthGuard;

  beforeEach((): void => {
    idp = { verifyToken: jest.fn() };
    auth = { resolveActiveUser: jest.fn() };
    guard = new OptionalAuthGuard(
      idp as unknown as IIdentityProvider,
      auth as unknown as AuthService,
    );
  });

  it('returns true without verifying token when Authorization header is missing', async (): Promise<void> => {
    const { ctx } = makeContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(idp.verifyToken).not.toHaveBeenCalled();
    expect(auth.resolveActiveUser).not.toHaveBeenCalled();
  });

  it('returns true without verifying token when Authorization header is malformed', async (): Promise<void> => {
    const { ctx } = makeContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(idp.verifyToken).not.toHaveBeenCalled();
    expect(auth.resolveActiveUser).not.toHaveBeenCalled();
  });

  it('attaches request.user when bearer token resolves to an active user', async (): Promise<void> => {
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
    auth.resolveActiveUser.mockResolvedValue(user);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(auth.resolveActiveUser).toHaveBeenCalledWith({
      sub: 'sub-123',
      email: 'a@b.com',
      displayName: 'A B',
    });
    expect(request.user).toBe(user);
  });

  it('propagates ACCOUNT_BLOCKED instead of degrading to anonymous', async (): Promise<void> => {
    const { ctx, request } = makeContext({ authorization: 'Bearer my.jwt.token' });
    const claims: IdentityClaims = {
      sub: 'sub-123',
      email: 'a@b.com',
      displayName: 'A B',
      emailConfirmed: true,
      exp: 9999999999,
    };
    idp.verifyToken.mockResolvedValue(claims);
    auth.resolveActiveUser.mockRejectedValue(
      new ForbiddenException({ code: 'ACCOUNT_BLOCKED', message: 'Account is blocked' }),
    );

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'ACCOUNT_BLOCKED' },
    });
    expect(request.user).toBeUndefined();
  });
});
