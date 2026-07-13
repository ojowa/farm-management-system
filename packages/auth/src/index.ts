export {
  verifyAccessToken,
  signServiceToken,
  verifyServiceToken,
  extractBearerToken,
  AuthError,
} from './jwt';
export type { VerifiedUser, ServiceTokenPayload } from './jwt';
export * from './roles';
export { setCookie, deleteCookie, setAuthCookies, clearAuthCookies } from './cookie';
export {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser,
  getMfaToken,
  setMfaToken,
  clearAllAuthStorage,
} from './storage';

// Re-export NestJS-specific symbols so services can import from '@farm/auth'
// instead of '@farm/auth/nestjs'. NestJS is an optional peer dependency.
export {
  AUTH_ROLES_KEY,
  AUTH_PERMISSION_KEY,
  Roles,
  Permission,
  JwtAuthGuard,
  AuthorizationGuard,
  Auth,
  CurrentUser,
} from './nestjs/index';
