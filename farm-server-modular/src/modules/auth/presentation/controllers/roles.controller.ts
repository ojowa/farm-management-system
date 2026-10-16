import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { RolesService } from '../../application/services/roles.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '../../../../kernel/auth/nestjs';

/**
 * The admin app's org-facing roles routes. Every call passes the caller's
 * organization from the JWT (`?? null`) so the service can scope the view and
 * the actions: organizations never see platform roles or each other's roles.
 * The platform console manages roles through `/platform-roles`
 * (PlatformAdminGuard) instead.
 */
@Controller('roles')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permission('organization.read')
  findAll(@Req() req: any) {
    return this.rolesService.findAll(req.user?.organizationId ?? null);
  }

  @Get(':id')
  @Permission('organization.read')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.findById(id, req.user?.organizationId ?? null);
  }

  @Post()
  @Permission('organization.manage')
  create(@Body() body: { name: string; description?: string; organizationId?: string }, @Req() req: any) {
    return this.rolesService.create(body, req.user?.organizationId ?? null);
  }

  @Put(':id')
  @Permission('organization.manage')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }, @Req() req: any) {
    return this.rolesService.update(id, body, req.user?.organizationId ?? null);
  }

  @Delete(':id')
  @Permission('organization.manage')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.delete(id, req.user?.organizationId ?? null);
  }

  @Post(':id/permissions')
  @Permission('organization.manage')
  setPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }, @Req() req: any) {
    return this.rolesService.setPermissions(id, body.permissionIds, req.user?.organizationId ?? null);
  }
}
