import { Controller, Get, Put, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { prisma } from '@farm/database';

@Controller('admin/organizations')
export class AdminController {
  @Get()
  async findAll() {
    return prisma.organization.findMany({ include: { _count: { select: { users: true, farms: true } } }, orderBy: { createdAt: 'desc' } });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, lastLoginAt: true, role: { select: { name: true } } } },
        farms: { select: { id: true, name: true } },
        _count: { select: { users: true, farms: true } },
      },
    });
  }

  @Put(':id/subscription')
  async updateSubscription(@Param('id') id: string, @Body() body: any) {
    const { subscriptionPlan, subscriptionStatus } = body;
    return prisma.organization.update({ where: { id }, data: { ...(subscriptionPlan && { subscriptionPlan }), ...(subscriptionStatus && { subscriptionStatus }) } });
  }

  @Get(':id/users')
  async getUsers(@Param('id') id: string) {
    return prisma.user.findMany({
      where: { organizationId: id },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, lastLoginAt: true, role: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Put('users/:id/toggle-active')
  @HttpCode(HttpStatus.OK)
  async toggleActive(@Param('id') id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    return prisma.user.update({ where: { id }, data: { isActive: !user?.isActive }, select: { id: true, firstName: true, lastName: true, email: true, isActive: true } });
  }
}
