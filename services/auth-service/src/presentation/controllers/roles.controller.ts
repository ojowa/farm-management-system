import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from '../../application/services/roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  create(@Body() body: { name: string; description?: string; organizationId?: string }) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.setPermissions(id, body.permissionIds);
  }
}
