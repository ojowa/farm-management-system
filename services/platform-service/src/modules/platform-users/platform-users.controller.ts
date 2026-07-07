import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { PlatformAdminGuard, SuperAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-users')
@UseGuards(PlatformAdminGuard)
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  findAll(
    @Query() query: { page?: number; limit?: number; search?: string; role?: string; orgId?: string },
  ) {
    return this.platformUsersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformUsersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; phone?: string; email?: string; isActive?: boolean; roleId?: string },
    @Request() req: any,
  ) {
    return this.platformUsersService.update(id, body, req.user.id);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.platformUsersService.deactivate(id, req.user.id);
  }

  @Post(':id/impersonate')
  @UseGuards(SuperAdminGuard)
  impersonate(@Param('id') id: string, @Request() req: any) {
    return this.platformUsersService.impersonate(req.user.id, id);
  }

  @Post(':id/force-logout')
  forceLogout(@Param('id') id: string, @Request() req: any) {
    return this.platformUsersService.forceLogout(id, req.user.id);
  }

  @Get(':id/sessions')
  getSessions(@Param('id') id: string) {
    return this.platformUsersService.getSessions(id);
  }
}
