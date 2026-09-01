import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    return prisma.permission.create({ data });
  }

  async delete(id: string) {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: { _count: { select: { roles: true } } },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    if (permission._count.roles > 0) throw new Error('Cannot delete permission assigned to roles');
    return prisma.permission.delete({ where: { id } });
  }
}
