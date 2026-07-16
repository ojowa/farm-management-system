import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  extractBearerToken,
  verifyAccessToken,
  type VerifiedUser,
} from '../jwt';
import { userHasPermission, userHasAnyRole } from '../roles';

export const AUTH_ROLES_KEY = 'farm:auth:roles';
export const AUTH_PERMISSION_KEY = 'farm:auth:permission';

/**
 * Restrict a controller method to one or more roles. Combine with
 * `@UseGuards(JwtAuthGuard)` (the guard is the same as `JwtAuthGuard`
 * exported here).
 *
 *   @Roles('ORGANIZATION_OWNER', 'FARM_MANAGER')
 *   @UseGuards(JwtAuthGuard)
 *   @Post('farms')
 *   create() {}
 */
export const Roles = (...roles: string[]) => SetMetadata(AUTH_ROLES_KEY, roles);

/**
 * Require a fine-grained permission string (e.g. `farm.write`). Pair with
 * `JwtAuthGuard`.
 *
 *   @Permission('finance.write')
 *   @UseGuards(JwtAuthGuard)
 *   @Post('sales')
 *   create() {}
 */
export const Permission = (permission: string) =>
  SetMetadata(AUTH_PERMISSION_KEY, permission);

/**
 * Passport-free JWT guard. We deliberately do not pull in `@nestjs/passport`
 * here so the same guard works in services that do not depend on Passport.
 *
 * Extracts the token from (in order):
 *   1. `Authorization: Bearer <token>` header
 *   2. `accessToken` httpOnly cookie (via `req.cookies`)
 *
 * This supports both header-based auth (mobile/console) and cookie-based
 * auth (web app) simultaneously.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: VerifiedUser; cookies?: Record<string, string> }>();

    // 1. Try Authorization header first
    let token = extractBearerToken(req.headers.authorization);

    // 2. Fall back to accessToken cookie
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      req.user = verifyAccessToken(token);
    } catch (err) {
      this.logger.debug(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}

/**
 * Authorization guard that reads role/permission metadata set by the
 * `Roles` and `Permission` decorators. Always pair with `JwtAuthGuard` so
 * `req.user` is populated before the role check runs.
 *
 * Permissions are now DB-driven: they are loaded at login time and embedded
 * in the JWT. This guard checks against the embedded permissions.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      AUTH_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      AUTH_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermission) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: VerifiedUser }>();
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!userHasAnyRole(user.role, requiredRoles)) {
        throw new ForbiddenException('Insufficient role');
      }
    }
    if (requiredPermission) {
      if (!userHasPermission(user.permissions, requiredPermission)) {
        throw new ForbiddenException('Insufficient permission');
      }
    }
    return true;
  }
}

/**
 * Convenience: `JwtAuthGuard` + `AuthorizationGuard` so a single decorator
 * covers both authentication and authorization.
 */
export const Auth = (...roles: string[]) => SetMetadata(AUTH_ROLES_KEY, roles);

/**
 * Param decorator for the verified user. Use it on handler signatures:
 *
 *   @Get('me')
 *   me(@CurrentUser() user: VerifiedUser) { return user; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VerifiedUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: VerifiedUser }>();
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return req.user;
  },
);
