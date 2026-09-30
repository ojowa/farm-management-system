import { Injectable, NotFoundException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';

@Injectable()
export class OrgAdminService {
  async getOrganization(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.organizationId) throw new NotFoundException('No organization found');
    return prisma.organization.findUnique({ where: { id: user.organizationId } });
  }

  async updateOrganization(userId: string, data: { name?: string; phone?: string; website?: string; logo?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.organizationId) throw new NotFoundException('No organization found');
    return prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: data.name !== undefined ? data.name?.trim() || undefined : undefined,
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        website: data.website !== undefined ? data.website?.trim() || null : undefined,
        logo: data.logo !== undefined ? data.logo : undefined,
      },
    });
  }

  async listUsers(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.organizationId) throw new NotFoundException('No organization found');
    return prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: true },
    });
  }

  async createUser(organizationId: string, data: { email: string; firstName: string; lastName: string; roleId: string }) {
    const email = data?.email?.trim();
    const firstName = data?.firstName?.trim();
    const lastName = data?.lastName?.trim();
    if (!email || !firstName || !lastName) throw new BadRequestException('email, firstName and lastName are required');
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await prisma.user.create({
      data: { email, firstName, lastName, roleId: data.roleId, passwordHash, organizationId },
      include: { role: true },
    });
    return { user, tempPassword };
  }

  async updateUser(userId: string, data: { firstName?: string; lastName?: string; roleId?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return prisma.user.update({ where: { id: userId }, data });
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await prisma.user.delete({ where: { id: userId } });
  }

  async listRoles(organizationId: string) {
    return prisma.role.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      include: { _count: { select: { users: true } } },
    });
  }

  async createRole(organizationId: string, data: { name: string; description?: string }) {
    if (!data?.name?.trim()) throw new BadRequestException('Role name is required');
    return prisma.role.create({ data: { name: data.name.trim(), description: data.description || null, organizationId } });
  }

  async updateRole(roleId: string, data: { name?: string; description?: string }) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be modified');
    return prisma.role.update({ where: { id: roleId }, data });
  }

  async deleteRole(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) throw new ConflictException('Cannot delete role with assigned users');
    return prisma.role.delete({ where: { id: roleId } });
  }
}
