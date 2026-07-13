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

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.role?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      isPlatformAdmin: true,
    };

    return true;
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

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.role?.isPlatformAdmin) {
      throw new ForbiddenException('Super admin access required');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      isPlatformAdmin: true,
    };

    return true;
  }
}
