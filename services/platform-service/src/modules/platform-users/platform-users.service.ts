import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@farm/database';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class PlatformUsersService {
  constructor(private configService: ConfigService) {}

  private getJWTSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'secret';
  }

  async findAll(query: { page?: number; limit?: number; search?: string; role?: string; orgId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = { name: query.role };
    if (query.orgId) where.organizationId = query.orgId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, organization: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role.name,
        organizationId: u.organizationId,
        organizationName: u.organization?.name ?? null,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, organization: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { loginAt: 'desc' },
      take: 10,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      sessions: sessions.map((s) => ({
        id: s.id,
        app: s.app,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        loginAt: s.loginAt,
        lastActive: s.lastActive,
        logoutAt: s.logoutAt,
      })),
    };
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
      roleId?: string;
    },
    auditUserId: string,
  ) {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.roleId !== undefined && { roleId: data.roleId }),
      },
      include: { role: true, organization: true },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'user.update', entity: 'User', entityId: id },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role.name,
      organizationId: updatedUser.organizationId,
      organizationName: updatedUser.organization?.name ?? null,
      isActive: updatedUser.isActive,
    };
  }

  async deactivate(id: string, auditUserId: string) {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await prisma.userSession.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false, logoutAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'user.deactivate', entity: 'User', entityId: id },
    });

    return { message: 'User deactivated successfully' };
  }

  async impersonate(platformUserId: string, targetUserId: string) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }
    if (!targetUser.isActive) {
      throw new BadRequestException('Cannot impersonate inactive user');
    }

    const impersonationToken = jwt.sign(
      {
        sub: targetUser.id,
        email: targetUser.email,
        role: targetUser.role.name,
        organizationId: targetUser.organizationId,
        impersonatorId: platformUserId,
        isImpersonation: true,
      },
      this.getJWTSecret(),
      { expiresIn: '1h' },
    );

    await prisma.auditLog.create({
      data: {
        userId: platformUserId,
        action: 'user.impersonate',
        entity: 'User',
        entityId: targetUserId,
      },
    });

    return {
      impersonationToken,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role.name,
        organizationId: targetUser.organizationId,
      },
    };
  }

  async forceLogout(id: string, auditUserId: string) {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const result = await prisma.userSession.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false, logoutAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: auditUserId,
        action: 'user.force-logout',
        entity: 'User',
        entityId: id,
      },
    });

    return { message: 'All sessions terminated', sessionsTerminated: result.count };
  }

  async getSessions(id: string) {
    const sessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { loginAt: 'desc' },
    });
    return { sessions };
  }
}
