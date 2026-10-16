import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from '../../application/services/permissions.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('permissions')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permission('organization.read')
  findAll() {
    // The org's permission catalog: platform permissions (platform.manage)
    // are not part of it — the platform console reads `/platform-permissions`.
    return this.permissionsService.findAll({ excludePlatform: true });
  }

  @Post()
  @Permission('organization.manage')
  create(@Body() body: { name: string; description?: string; category?: string }) {
    return this.permissionsService.create(body, { orgScoped: true });
  }

  @Delete(':id')
  @Permission('organization.manage')
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id, { orgScoped: true });
  }
}
