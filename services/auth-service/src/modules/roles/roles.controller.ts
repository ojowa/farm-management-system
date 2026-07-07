import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { prisma } from '@farm/database';

@Controller('roles')
export class RolesController {
  @Get()
  async findAll() {
    return prisma.role.findMany({ include: { _count: { select: { permissions: true, users: true } } }, orderBy: { name: 'asc' } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    const { name, description, permissionIds } = body;
    const existing = await prisma.role.findFirst({ where: { name, organizationId: null } });
    if (existing) throw new Error('Role name already exists');
    return prisma.role.create({
      data: { name, organizationId: null, description: description || null, permissions: permissionIds?.length ? { create: permissionIds.map((id: string) => ({ permission: { connect: { id } } })) } : undefined },
      include: { permissions: { include: { permission: true } }, _count: { select: { permissions: true, users: true } } },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } }, _count: { select: { permissions: true, users: true } } } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing?.isSystem && body.name && body.name !== existing.name) throw new Error('Cannot rename system roles');
    return prisma.role.update({ where: { id }, data: { ...(body.name && { name: body.name }), ...(body.description !== undefined && { description: body.description }) }, include: { permissions: { include: { permission: true } }, _count: { select: { permissions: true, users: true } } } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const existing = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (existing?.isSystem) throw new Error('Cannot delete system roles');
    if (existing && existing._count && existing._count.users > 0) throw new Error('Cannot delete role with assigned users');
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    return { message: 'Role deleted' };
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async replacePermissions(@Param('id') id: string, @Body('permissionIds') permissionIds: string[]) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) });
    }
    return prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } }, _count: { select: { permissions: true, users: true } } } });
  }
}
