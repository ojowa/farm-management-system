import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@farm/database';
import { RoleRepository } from '../../domain/repositories/role.repository';

@Injectable()
export class RolesService {
  constructor(private readonly roleRepo: RoleRepository) {}

  async findAll() {
    return prisma.role.findMany({
      include: {
        _count: { select: { permissions: true, users: true } },
      },
    });
  }

  async findById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(data: { name: string; description?: string; organizationId?: string }) {
    return prisma.role.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new Error('Cannot rename system role');
    return prisma.role.update({ where: { id }, data });
  }

  async delete(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new Error('Cannot delete system role');
    if (role._count.users > 0) throw new Error('Cannot delete role with assigned users');
    return prisma.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }
}
