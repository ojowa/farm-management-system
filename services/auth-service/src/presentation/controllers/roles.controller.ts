import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from '../../application/services/roles.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';

@Controller('roles')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permission('organization.read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permission('organization.read')
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Permission('organization.manage')
  create(@Body() body: { name: string; description?: string; organizationId?: string }) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  @Permission('organization.manage')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @Permission('organization.manage')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/permissions')
  @Permission('organization.manage')
  setPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.setPermissions(id, body.permissionIds);
  }
}
