import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return null;
    return this.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user) return null;
    return this.toDomain(user);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { role: true },
    });
    if (!user) return null;
    return this.toDomain(user);
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    roleId: string;
    organizationId?: string;
  }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: data.roleId,
        organizationId: data.organizationId || null,
      },
      include: { role: true },
    });
    return this.toDomain(user);
  }

  async update(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string;
  }>): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
    return this.toDomain(user);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  private toDomain(raw: any): User {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phone: raw.phone,
      roleId: raw.roleId,
      roleName: raw.role?.name,
      passwordHash: raw.passwordHash,
      avatar: raw.avatar,
      isActive: raw.isActive,
      lastLoginAt: raw.lastLoginAt,
      twoFactorEnabled: raw.twoFactorEnabled,
      twoFactorSecret: raw.twoFactorSecret,
      notificationPreferences: raw.notificationPreferences,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
