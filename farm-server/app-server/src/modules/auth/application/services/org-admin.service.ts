import { Injectable, NotFoundException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';

@Injectable()
export class OrgAdminService {
  /**
   * A role may only be assigned inside the caller's organization: system
   * roles (organizationId null) are global, everything else must match.
   */
  private async assertRoleUsable(organizationId: string, roleId: string): Promise<void> {
    if (!organizationId || !roleId) throw new BadRequestException('Unknown role');
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || (role.organizationId && role.organizationId !== organizationId)) {
      throw new BadRequestException('Unknown role');
    }
  }

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
    if (data.roleId) await this.assertRoleUsable(organizationId, data.roleId);
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

  async updateUser(organizationId: string, userId: string, data: { firstName?: string; lastName?: string; roleId?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Ownership: a tenant admin may only touch users of their OWN org, and
    // only whitelisted fields — the raw body must never reach `update`
    // (it could otherwise rewrite passwordHash or organizationId).
    if (!user || !organizationId || user.organizationId !== organizationId) {
      throw new NotFoundException('User not found');
    }
    const clean: { firstName?: string; lastName?: string; roleId?: string } = {};
    if (data.firstName !== undefined) clean.firstName = data.firstName;
    if (data.lastName !== undefined) clean.lastName = data.lastName;
    if (data.roleId !== undefined) {
      await this.assertRoleUsable(organizationId, data.roleId);
      clean.roleId = data.roleId;
    }
    return prisma.user.update({ where: { id: userId }, data: clean });
  }

  async deleteUser(organizationId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !organizationId || user.organizationId !== organizationId) {
      throw new NotFoundException('User not found');
    }
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

  async updateRole(organizationId: string, roleId: string, data: { name?: string; description?: string }) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    // Ownership: custom roles of other organizations read as not-found.
    // Global roles (organizationId null) fall through to the isSystem guard.
    if (!organizationId || (role.organizationId && role.organizationId !== organizationId)) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) throw new BadRequestException('System roles cannot be modified');
    const clean: { name?: string; description?: string } = {};
    if (data.name !== undefined) clean.name = data.name;
    if (data.description !== undefined) clean.description = data.description;
    return prisma.role.update({ where: { id: roleId }, data: clean });
  }

  async deleteRole(organizationId: string, roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (!organizationId || (role.organizationId && role.organizationId !== organizationId)) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) throw new ConflictException('Cannot delete role with assigned users');
    return prisma.role.delete({ where: { id: roleId } });
  }
}
