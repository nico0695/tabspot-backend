import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRole } from '@src/generated/prisma/client';

import { RolesGuard } from '../roles.guard';

interface MockRequest {
  user?: { role: UserRole };
}

function makeContext(user?: { role: UserRole }): ExecutionContext {
  const request: MockRequest = { user };
  return {
    switchToHttp: (): { getRequest: () => MockRequest } => ({
      getRequest: (): MockRequest => request,
    }),
    getHandler: (): unknown => (): void => {},
    getClass: (): unknown => class {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach((): void => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('returns true when no @Roles metadata is present', (): void => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: 'USER' as UserRole }))).toBe(true);
  });

  it('returns true when metadata is an empty array', (): void => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext({ role: 'USER' as UserRole }))).toBe(true);
  });

  it('returns true when user role matches the only allowed role', (): void => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(makeContext({ role: 'ADMIN' as UserRole }))).toBe(true);
  });

  it('returns true when user role is one of multiple allowed roles', (): void => {
    reflector.getAllAndOverride.mockReturnValue(['USER', 'ADMIN']);
    expect(guard.canActivate(makeContext({ role: 'USER' as UserRole }))).toBe(true);
  });

  it('throws ForbiddenException with code FORBIDDEN when role does not match', (): void => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    let thrown: unknown;
    try {
      guard.canActivate(makeContext({ role: 'USER' as UserRole }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect((thrown as ForbiddenException).getResponse()).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws ForbiddenException when request.user is undefined but roles are required', (): void => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect((): boolean => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
