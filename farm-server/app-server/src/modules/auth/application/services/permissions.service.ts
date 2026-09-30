import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { prisma } from '@farm/database';

@Injectable()
export class PermissionsService {
  async findAll() {
    return prisma.permission.findMany({
      include: { _count: { select: { roles: true } } },
      orderBy: { category: 'asc' },
    });
  }

  async create(data: { name: string; description?: string; category?: string }) {
    if (!data?.name?.trim()) throw new BadRequestException('Permission name is required');
    return prisma.permission.create({
      data: { ...data, name: data.name.trim(), description: data.description || null, category: data.category || null },
    });
  }

  async delete(id: string) {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: { _count: { select: { roles: true } } },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    if (permission._count.roles > 0) throw new ConflictException('Cannot delete permission assigned to roles');
    return prisma.permission.delete({ where: { id } });
  }
}
