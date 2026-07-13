import jwt from 'jsonwebtoken';

// Work around typings mismatch in this repo's `jsonwebtoken`/`@types/jsonwebtoken`.
// We only rely on runtime behavior of `jwt.verify`.
const verify = (jwt as any).verify as (
  token: string,
  secret: string
) => unknown;

export interface VerifiedUser {
  id: string;
  email: string | null;
  role: string;
  permissions: string[];
  organizationId: string | null;
}

const resolveSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
};

/**
 * Verify a bearer token and return a normalized user object. Throws on any
 * verification failure (missing, expired, malformed, wrong signature).
 */
export const verifyAccessToken = (token: string): VerifiedUser => {
  // jsonwebtoken typings vary by version; keep runtime typing explicit.
  const decoded = verify(token, resolveSecret()) as any;

  if (!decoded || !decoded.sub || !decoded.role) {
    throw new Error('Invalid token payload');
  }

  return {
    id: decoded.sub,
    email: decoded.email ?? null,
    role: decoded.role,
    permissions: decoded.permissions ?? [],
    organizationId: decoded.organizationId ?? null,
  };
};

export const extractBearerToken = (authorization?: string | null): string | null => {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
};

/**
 * Throws a JSON-friendly Error used by both Express middleware and NestJS
 * guards. Services translate these into 401/403 responses via their existing
 * error handling (the API gateway exception filter, the auth middleware).
 */
export class AuthError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
