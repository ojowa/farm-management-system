import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('[PlatformAdminGuard] Request received:', { 
      method: request.method, 
      url: request.url,
      hasAuthHeader: !!request.headers.authorization,
      authHeaderPrefix: request.headers.authorization?.substring(0, 20)
    });

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[PlatformAdminGuard] No valid Authorization header');
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    console.log('[PlatformAdminGuard] Token extracted, length:', token.length);

    const jwtSecret = this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    console.log('[PlatformAdminGuard] JWT_SECRET from config:', !!this.configService.get<string>('JWT_SECRET'), 'from env:', !!process.env.JWT_SECRET);
    if (!jwtSecret) {
      console.error('[PlatformAdminGuard] JWT_SECRET is missing!');
      throw new InternalServerErrorException('JWT_SECRET configuration missing');
    }
    console.log('[PlatformAdminGuard] JWT_SECRET length:', jwtSecret.length);

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
      console.log('[PlatformAdminGuard] Token decoded:', { sub: decoded.sub, role: decoded.role, exp: decoded.exp });
    } catch (err) {
      console.error('[PlatformAdminGuard] JWT verify failed:', err instanceof Error ? err.message : err);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded?.sub) {
      console.log('[PlatformAdminGuard] No sub in decoded token');
      throw new UnauthorizedException('Invalid token payload');
    }

    let user;
    try {
      console.log('[PlatformAdminGuard] Querying user:', decoded.sub);
      user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });
      console.log('[PlatformAdminGuard] User found:', user ? { id: user.id, email: user.email, role: user.role?.name, isPlatformAdmin: user.role?.isPlatformAdmin } : null);
    } catch (err) {
      console.error('[PlatformAdminGuard] Database error:', err);
      throw new InternalServerErrorException('Database error');
    }

    if (!user || !user.isActive) {
      console.log('[PlatformAdminGuard] User not found or inactive');
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.role?.isPlatformAdmin) {
      console.log('[PlatformAdminGuard] User role is not platform admin:', user.role?.name, 'isPlatformAdmin:', user.role?.isPlatformAdmin);
      throw new ForbiddenException('Platform admin access required');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      isPlatformAdmin: true,
    };

    console.log('[PlatformAdminGuard] Access granted for:', user.email);
    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('[SuperAdminGuard] Request received:', { 
      method: request.method, 
      url: request.url,
      hasAuthHeader: !!request.headers.authorization,
      authHeaderPrefix: request.headers.authorization?.substring(0, 20)
    });

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[SuperAdminGuard] No valid Authorization header');
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    console.log('[SuperAdminGuard] Token extracted, length:', token.length);

    const jwtSecret = this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    console.log('[SuperAdminGuard] JWT_SECRET from config:', !!this.configService.get<string>('JWT_SECRET'), 'from env:', !!process.env.JWT_SECRET);
    if (!jwtSecret) {
      console.error('[SuperAdminGuard] JWT_SECRET is missing!');
      throw new InternalServerErrorException('JWT_SECRET configuration missing');
    }
    console.log('[SuperAdminGuard] JWT_SECRET length:', jwtSecret.length);

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
      console.log('[SuperAdminGuard] Token decoded:', { sub: decoded.sub, role: decoded.role, exp: decoded.exp });
    } catch (err) {
      console.error('[SuperAdminGuard] JWT verify failed:', err instanceof Error ? err.message : err);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded?.sub) {
      console.log('[SuperAdminGuard] No sub in decoded token');
      throw new UnauthorizedException('Invalid token payload');
    }

    let user;
    try {
      console.log('[SuperAdminGuard] Querying user:', decoded.sub);
      user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });
      console.log('[SuperAdminGuard] User found:', user ? { id: user.id, email: user.email, role: user.role?.name, isPlatformAdmin: user.role?.isPlatformAdmin } : null);
    } catch (err) {
      console.error('[SuperAdminGuard] Database error:', err);
      throw new InternalServerErrorException('Database error');
    }

    if (!user || !user.isActive) {
      console.log('[SuperAdminGuard] User not found or inactive');
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.role?.isPlatformAdmin) {
      console.log('[SuperAdminGuard] User role is not platform admin:', user.role?.name, 'isPlatformAdmin:', user.role?.isPlatformAdmin);
      throw new ForbiddenException('Super admin access required');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      isPlatformAdmin: true,
    };

    console.log('[SuperAdminGuard] Access granted for:', user.email);
    return true;
  }
}
