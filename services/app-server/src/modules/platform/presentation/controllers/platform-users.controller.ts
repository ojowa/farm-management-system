import { Controller, Get, Patch, Delete, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformUserService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-users')
@UseGuards(PlatformAdminGuard)
export class PlatformUsersController {
  constructor(private readonly userService: PlatformUserService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.userService.findAllUsers(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findUser(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.userService.updateUser(id, body, req.user.id);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.userService.deactivateUser(id, req.user.id);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.userService.toggleUserActive(id, req.user.id);
  }

  @Post(':id/impersonate')
  impersonate(@Param('id') id: string, @Request() req: any) {
    return this.userService.impersonateUser(id, req.user.id);
  }

  @Post(':id/force-logout')
  forceLogout(@Param('id') id: string, @Request() req: any) {
    return this.userService.forceLogoutUser(id, req.user.id);
  }

  @Get(':id/sessions')
  getSessions(@Param('id') id: string) {
    return this.userService.getUserSessions(id);
  }
}
