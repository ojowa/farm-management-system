import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { prisma } from '@farm/database';

@Controller('permissions')
export class PermissionsController {
  @Get()
  async findAll() {
    const permissions = await prisma.permission.findMany({ include: { _count: { select: { roles: true } } }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    const grouped: Record<string, any[]> = {};
    for (const p of permissions) {
      const cat = p.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    return { permissions, grouped };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    const { name, description, category } = body;
    const existing = await prisma.permission.findUnique({ where: { name } });
    if (existing) throw new Error('Permission name already exists');
    return prisma.permission.create({ data: { name, description, category } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const roleCount = await prisma.rolePermission.count({ where: { permissionId: id } });
    if (roleCount > 0) throw new Error('Cannot delete permission assigned to roles');
    await prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted' };
  }
}
