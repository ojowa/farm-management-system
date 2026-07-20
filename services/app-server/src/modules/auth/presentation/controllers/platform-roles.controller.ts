import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RolesService } from '../../application/services/roles.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('platform-roles')
export class PlatformRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permission('role.read')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Permission('role.read')
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Permission('role.write')
  @Post()
  create(@Body() body: { name: string; description?: string; organizationId?: string }) {
    return this.rolesService.create(body);
  }

  @Permission('role.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.rolesService.update(id, body);
  }

  @Permission('role.write')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Permission('role.write')
  @Post(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.setPermissions(id, body.permissionIds);
  }
}
