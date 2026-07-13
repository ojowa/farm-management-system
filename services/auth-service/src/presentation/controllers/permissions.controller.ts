import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from '../../application/services/permissions.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';

@Controller('permissions')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permission('organization.read')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Post()
  @Permission('organization.manage')
  create(@Body() body: { name: string; description?: string; category?: string }) {
    return this.permissionsService.create(body);
  }

  @Delete(':id')
  @Permission('organization.manage')
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }
}
