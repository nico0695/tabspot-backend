import type { IdentityClaims, IIdentityProvider } from '@modules/auth/ports/identity-provider.port';

export const E2E_USER_TOKEN = 'e2e-user-token';
export const E2E_ADMIN_TOKEN = 'e2e-admin-token';

export const E2E_USER_AUTH_ID = '10000000-0000-4000-8000-000000000001';
export const E2E_ADMIN_AUTH_ID = '10000000-0000-4000-8000-000000000002';

const DEFAULT_EXP_SECONDS = 4_102_444_800; // 2100-01-01T00:00:00Z

const E2E_CLAIMS_BY_TOKEN: ReadonlyMap<string, IdentityClaims> = new Map([
  [
    E2E_USER_TOKEN,
    {
      sub: E2E_USER_AUTH_ID,
      email: 'e2e-user@example.com',
      displayName: 'E2E User',
      emailConfirmed: true,
      exp: DEFAULT_EXP_SECONDS,
    },
  ],
  [
    E2E_ADMIN_TOKEN,
    {
      sub: E2E_ADMIN_AUTH_ID,
      email: 'e2e-admin@example.com',
      displayName: 'E2E Admin',
      emailConfirmed: true,
      exp: DEFAULT_EXP_SECONDS,
    },
  ],
]);

export function bearer(token: string): string {
  return `Bearer ${token}`;
}

export function createE2eIdentityProvider(): IIdentityProvider {
  return {
    verifyToken(jwt: string): Promise<IdentityClaims> {
      const claims = E2E_CLAIMS_BY_TOKEN.get(jwt);
      if (claims === undefined) {
        throw new Error(`Unknown E2E token: ${jwt}`);
      }
      return Promise.resolve(claims);
    },
  };
}
