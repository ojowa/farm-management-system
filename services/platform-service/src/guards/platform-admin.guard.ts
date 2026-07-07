import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'secret';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;

      if (!decoded?.sub || !decoded?.role) {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(decoded.role)) {
        throw new ForbiddenException('Platform admin access required');
      }

      request.user = {
        id: decoded.sub,
        email: decoded.email ?? null,
        role: decoded.role,
        organizationId: decoded.organizationId,
        isPlatformAdmin: true,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'secret';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;

      if (!decoded?.sub || !decoded?.role) {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (decoded.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Super admin access required');
      }

      request.user = {
        id: decoded.sub,
        email: decoded.email ?? null,
        role: decoded.role,
        organizationId: decoded.organizationId,
        isPlatformAdmin: true,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
