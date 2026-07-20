declare module '@farm/auth' {

  export type VerifiedUser = {
    id: string;
    email: string | null;
    role: string;
    permissions: string[];
    organizationId: string;
  };

  export class AuthError extends Error {
    statusCode: number;
  }

  export function extractBearerToken(authHeader?: string): string | null;
  export function verifyAccessToken(token: string): VerifiedUser;

  export const JwtAuthGuard: any;
  export const AuthorizationGuard: any;

  export function userHasAnyRole(userRole: string, requiredRoles: string[]): boolean;
  export function userHasPermission(userPermissions: string[], requiredPermission: string): boolean;

  export const ROLES: any;
  export const AUTH_ROLES_KEY: string;
  export const AUTH_PERMISSION_KEY: string;
  export const Roles: any;
  export const Permission: any;
  export const CurrentUser: any;

  export function authMiddleware(...args: any[]): any;
  export function requireAuth(...args: any[]): any;
  export function asyncHandler(...args: any[]): any;
}
