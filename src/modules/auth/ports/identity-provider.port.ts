export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');

export interface IdentityClaims {
  sub: string;
  email: string;
  displayName: string | null;
  emailConfirmed: boolean;
  exp: number;
}

export interface IIdentityProvider {
  verifyToken(jwt: string): Promise<IdentityClaims>;
}
