import { Controller, Get, Post, Put, Delete, Body, Param, Req, HttpCode, HttpStatus, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';

@Controller('org-admin')
export class OrgAdminController {
  @Get('me')
  async getOrg(@Req() req: any) {
    const orgId = req.user?.organizationId;
    if (!orgId) throw new BadRequestException('No organization context');
    return prisma.organization.findUnique({ where: { id: orgId }, include: { _count: { select: { users: true, farms: true } } } });
  }

  @Put('me')
  async updateOrg(@Req() req: any, @Body() body: any) {
    const orgId = req.user?.organizationId;
    if (!orgId) throw new BadRequestException('No organization context');
    return prisma.organization.update({ where: { id: orgId }, data: { ...(body.name !== undefined && { name: body.name }), ...(body.email !== undefined && { email: body.email }), ...(body.phone !== undefined && { phone: body.phone }), ...(body.website !== undefined && { website: body.website }), ...(body.industry !== undefined && { industry: body.industry }), ...(body.logo !== undefined && { logo: body.logo }), ...(body.settings !== undefined && { settings: body.settings }) } });
  }

  @Get('users')
  async getUsers(@Req() req: any) {
    const orgId = req.user?.organizationId;
    return prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true, firstName: true, lastName: true, middleName: true, email: true, phone: true, avatar: true, isActive: true, lastLoginAt: true, createdAt: true, role: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(@Req() req: any, @Body() body: any) {
    const orgId = req.user?.organizationId;
    const { firstName, lastName, middleName, email, phone, roleId } = body;
    if (!firstName || !lastName || !email) throw new BadRequestException('firstName, lastName, and email are required');
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('User with this email already exists');
    let assignedRoleId = roleId;
    if (!assignedRoleId) { const workerRole = await prisma.role.findFirst({ where: { name: 'WORKER', organizationId: null } }); assignedRoleId = workerRole?.id; }
    if (!assignedRoleId) throw new BadRequestException('No valid role specified');
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    return prisma.user.create({ data: { organizationId: orgId, firstName, lastName, middleName: middleName || null, email, phone: phone || null, passwordHash, roleId: assignedRoleId }, select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } } });
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    const orgId = req.user?.organizationId;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.organizationId !== orgId) throw new NotFoundException('User not found in your organization');
    const updateData: any = {};
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.roleId !== undefined && id !== req.user.sub) updateData.roleId = body.roleId;
    if (body.isActive !== undefined && id !== req.user.sub) updateData.isActive = body.isActive;
    return prisma.user.update({ where: { id }, data: updateData, select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: { select: { id: true, name: true } } } });
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    if (id === req.user.sub) throw new ForbiddenException('Cannot remove yourself from the organization');
    await prisma.user.delete({ where: { id } });
    return { message: 'User removed' };
  }

  @Get('roles')
  async getRoles(@Req() req: any) {
    const orgId = req.user?.organizationId;
    return prisma.role.findMany({ where: { OR: [{ organizationId: null }, { organizationId: orgId }] }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Req() req: any, @Body() body: any) {
    const orgId = req.user?.organizationId;
    const { name, description, permissionIds } = body;
    const existing = await prisma.role.findFirst({ where: { name: name.trim(), organizationId: orgId } });
    if (existing) throw new ConflictException('A role with this name already exists in your organization');
    return prisma.role.create({
      data: { name: name.trim(), description: description || null, isSystem: false, organizationId: orgId, permissions: permissionIds?.length ? { create: permissionIds.map((pid: string) => ({ permissionId: pid })) } : undefined },
      include: { permissions: { include: { permission: true } } },
    });
  }

  @Get('roles/:id')
  async getRole(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const role = await prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.organizationId !== null && role.organizationId !== orgId) throw new NotFoundException('Role not found');
    return role;
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    const orgId = req.user?.organizationId;
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new ForbiddenException('Cannot modify system roles');
    if (existing.organizationId !== orgId) throw new ForbiddenException('Cannot modify roles from other organizations');
    return prisma.role.update({ where: { id }, data: { ...(body.name !== undefined && { name: body.name.trim() }), ...(body.description !== undefined && { description: body.description }), ...(body.permissionIds !== undefined && { permissions: { deleteMany: {}, create: body.permissionIds.map((pid: string) => ({ permissionId: pid })) } }) }, include: { permissions: { include: { permission: true } } } });
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const existing = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new ForbiddenException('Cannot delete system roles');
    if (existing.organizationId !== orgId) throw new ForbiddenException('Cannot delete roles from other organizations');
    if (existing._count.users > 0) throw new ForbiddenException('Cannot delete role with assigned users');
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    return { message: 'Role deleted' };
  }
}
