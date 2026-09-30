import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@farm/database';
import { RoleRepository } from '../../domain/repositories/role.repository';

@Injectable()
export class RolesService {
  constructor(@Inject('RoleRepository') private readonly roleRepo: RoleRepository) {}

  async findAll() {
    return prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
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
    if (!data?.name?.trim()) throw new BadRequestException('Role name is required');
    return prisma.role.create({ data: { ...data, name: data.name.trim() } });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be renamed');
    if (data.name !== undefined && !data.name.trim()) throw new BadRequestException('Role name is required');
    return prisma.role.update({
      where: { id },
      data: { ...data, name: data.name !== undefined ? data.name.trim() : undefined },
    });
  }

  async delete(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) throw new ConflictException('Cannot delete role with assigned users');
    return prisma.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    await this.roleRepo.setPermissions(roleId, permissionIds);
  }
}
