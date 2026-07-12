import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { OrgAdminService } from '../../application/services/org-admin.service';

@Controller('org-admin')
export class OrgAdminController {
  constructor(private readonly orgAdminService: OrgAdminService) {}

  @Get('me')
  getOrganization(@Req() req: any) {
    return this.orgAdminService.getOrganization(req.user?.sub);
  }

  @Put('me')
  updateOrganization(@Req() req: any, @Body() body: { name?: string; phone?: string; website?: string; logo?: string }) {
    return this.orgAdminService.updateOrganization(req.user?.sub, body);
  }

  @Get('users')
  listUsers(@Req() req: any) {
    return this.orgAdminService.listUsers(req.user?.sub);
  }

  @Post('users')
  createUser(@Req() req: any, @Body() body: { email: string; firstName: string; lastName: string; roleId: string }) {
    return this.orgAdminService.createUser(req.user?.organizationId, body);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { firstName?: string; lastName?: string; roleId?: string }) {
    return this.orgAdminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.orgAdminService.deleteUser(id);
  }

  @Get('roles')
  listRoles(@Req() req: any) {
    return this.orgAdminService.listRoles(req.user?.organizationId);
  }

  @Post('roles')
  createRole(@Req() req: any, @Body() body: { name: string; description?: string }) {
    return this.orgAdminService.createRole(req.user?.organizationId, body);
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.orgAdminService.updateRole(id, body);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.orgAdminService.deleteRole(id);
  }
}
