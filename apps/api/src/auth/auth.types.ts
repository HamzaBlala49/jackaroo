export const SESSION_COOKIE_NAME = 'jackaroo_session';

export interface JwtPayload {
  sub: string;
  jti: string;
  name: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface AuthenticatedUser {
  id: string;
  displayName: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  sessionId: string;
}

export interface RequestWithUser {
  user?: AuthenticatedUser;
  sessionId?: string;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}
