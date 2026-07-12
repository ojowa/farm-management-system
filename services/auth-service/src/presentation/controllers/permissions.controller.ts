import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { PermissionsService } from '../../application/services/permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; description?: string; category?: string }) {
    return this.permissionsService.create(body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }
}
