import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from '../../application/services/permissions.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('platform-permissions')
export class PlatformPermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Permission('role.read')
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Permission('role.write')
  @Post()
  create(@Body() body: { name: string; description?: string; category?: string }) {
    return this.permissionsService.create(body);
  }

  @Permission('role.write')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }
}
