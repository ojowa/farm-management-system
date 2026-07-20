import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken, type VerifiedUser } from '@farm/auth';
import { prisma } from '@farm/database';

const PLATFORM_ADMIN_KEY = 'farm:platform:admin';
const SUPER_ADMIN_KEY = 'farm:platform:super';

/**
 * Lightweight guard that verifies the JWT (via @farm/auth) and then
 * checks the DB for `role.isPlatformAdmin`. Replaces the old guard
 * that duplicated JWT verification logic.
 *
 * Use at class level on platform controllers:
 *   @UseGuards(PlatformAdminGuard)
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Extract and verify JWT (stateless — no DB call)
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Authentication required');

    let user: VerifiedUser;
    try {
      user = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check isPlatformAdmin from DB (one query per request — unavoidable
    // because the JWT doesn't embed isPlatformAdmin)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { select: { isPlatformAdmin: true, name: true } } },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!dbUser.role?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    // Attach verified user to request for downstream use
    req.user = {
      ...user,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
    };

    return true;
  }

  private extractToken(req: any): string | null {
    const auth = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    return null;
  }
}

/**
 * Restricts to SUPER_ADMIN only (not just any platform admin).
 * Used on dangerous operations like creating/deleting subscription plans.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Authentication required');

    let user: VerifiedUser;
    try {
      user = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { select: { isPlatformAdmin: true, name: true } } },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Only SUPER_ADMIN (not SUPPORT_ADMIN) can perform these actions
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin access required');
    }

    req.user = {
      ...user,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
    };

    return true;
  }

  private extractToken(req: any): string | null {
    const auth = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    return null;
  }
}
