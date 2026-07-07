import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@farm/database';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class PlatformAuthService {
  constructor(private configService: ConfigService) {}

  private getJWTSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'secret';
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role.name)) {
      throw new ForbiddenException('Platform admin access required');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        organizationId: user.organizationId,
        isPlatformAdmin: true,
      },
      this.getJWTSecret(),
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.getJWTSecret(),
      { expiresIn: '7d' },
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        organizationId: user.organizationId,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(refreshToken, this.getJWTSecret()) as any;
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or deactivated');
      }

      if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role.name)) {
        throw new ForbiddenException('Platform admin access required');
      }

      const newAccessToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role.name,
          organizationId: user.organizationId,
          isPlatformAdmin: true,
        },
        this.getJWTSecret(),
        { expiresIn: '15m' },
      );

      const newRefreshToken = jwt.sign(
        { sub: user.id, type: 'refresh' },
        this.getJWTSecret(),
        { expiresIn: '7d' },
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, organization: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role.name,
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization?.name ?? null,
    };
  }
}
