import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { OrgAdminService } from '../../application/services/org-admin.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('org-admin')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class OrgAdminController {
  constructor(private readonly orgAdminService: OrgAdminService) {}

  @Get('me')
  getOrganization(@Req() req: any) {
    return this.orgAdminService.getOrganization(req.user?.sub);
  }

  @Put('me')
  @Permission('organization.manage')
  updateOrganization(@Req() req: any, @Body() body: { name?: string; phone?: string; website?: string; logo?: string }) {
    return this.orgAdminService.updateOrganization(req.user?.sub, body);
  }

  @Get('users')
  @Permission('users.read')
  listUsers(@Req() req: any) {
    return this.orgAdminService.listUsers(req.user?.sub);
  }

  @Post('users')
  @Permission('users.manage')
  createUser(@Req() req: any, @Body() body: { email: string; firstName: string; lastName: string; roleId: string }) {
    return this.orgAdminService.createUser(req.user?.organizationId, body);
  }

  @Put('users/:id')
  @Permission('users.manage')
  updateUser(@Param('id') id: string, @Body() body: { firstName?: string; lastName?: string; roleId?: string }) {
    return this.orgAdminService.updateUser(id, body);
  }

  @Delete('users/:id')
  @Permission('users.manage')
  deleteUser(@Param('id') id: string) {
    return this.orgAdminService.deleteUser(id);
  }

  @Get('roles')
  @Permission('organization.read')
  listRoles(@Req() req: any) {
    return this.orgAdminService.listRoles(req.user?.organizationId);
  }

  @Post('roles')
  @Permission('organization.manage')
  createRole(@Req() req: any, @Body() body: { name: string; description?: string }) {
    return this.orgAdminService.createRole(req.user?.organizationId, body);
  }

  @Put('roles/:id')
  @Permission('organization.manage')
  updateRole(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.orgAdminService.updateRole(id, body);
  }

  @Delete('roles/:id')
  @Permission('organization.manage')
  deleteRole(@Param('id') id: string) {
    return this.orgAdminService.deleteRole(id);
  }
}
