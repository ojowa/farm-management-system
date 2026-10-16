import jwt from 'jsonwebtoken';

// Work around typings mismatch in this repo's `jsonwebtoken`/`@types/jsonwebtoken`.
// We only rely on runtime behavior of `jwt.verify`.
const verify = (jwt as any).verify as (
  token: string,
  secret: string,
  options?: { algorithms?: string[] }
) => unknown;
const sign = (jwt as any).sign as (
  payload: string | object,
  secret: string,
  options?: object
) => string;

export interface VerifiedUser {
  id: string;
  email: string | null;
  role: string;
  permissions: string[];
  organizationId: string | null;
}

export interface ServiceTokenPayload {
  /** The authenticated user's ID */
  userId: string;
  /** The user's email */
  email: string | null;
  /** The user's role name */
  role: string;
  /** The user's permissions */
  permissions: string[];
  /** The user's organization ID */
  organizationId: string | null;
  /** Token type marker */
  type: 'service';
}

const resolveSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[JWT] JWT_SECRET environment variable is NOT set!');
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

const resolveServiceSecret = (): string => {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) throw new Error('SERVICE_SECRET environment variable is required');
  return secret;
};

/**
 * Verify a bearer token and return a normalized user object. Throws on any
 * verification failure (missing, expired, malformed, wrong signature).
 */
export const verifyAccessToken = (token: string): VerifiedUser => {
  try {
    const secret = resolveSecret();
    const decoded = verify(token, secret, { algorithms: ['HS256'] }) as any;

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
  } catch (err) {
    throw err;
  }
};

/**
 * Sign a service-to-service token. The API gateway calls this when forwarding
 * requests to downstream services. The token proves the request was routed
 * through the gateway after JWT verification.
 *
 * Services must call `verifyServiceToken()` before trusting x-* headers.
 */
export const signServiceToken = (user: VerifiedUser): string => {
  const payload: ServiceTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    organizationId: user.organizationId,
    type: 'service',
  };
  return sign(payload, resolveServiceSecret(), { expiresIn: process.env.SERVICE_TOKEN_EXPIRY || '30s' });
};

/**
 * Verify a service token signed by the API gateway. Returns the verified
 * user context or throws if the token is invalid/expired/missing.
 *
 * Use in downstream services before trusting x-user-id, x-organization-id,
 * etc. headers.
 */
export const verifyServiceToken = (token: string): ServiceTokenPayload => {
  const decoded = verify(token, resolveServiceSecret(), { algorithms: ['HS256'] }) as any;

  if (!decoded || decoded.type !== 'service' || !decoded.userId) {
    throw new Error('Invalid service token payload');
  }

  return {
    userId: decoded.userId,
    email: decoded.email ?? null,
    role: decoded.role,
    permissions: decoded.permissions ?? [],
    organizationId: decoded.organizationId ?? null,
    type: 'service',
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
