import { Controller, Get, Patch, Delete, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlatformUserService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('platform-users')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformUsersController {
  constructor(private readonly userService: PlatformUserService) {}

  @Get()
  @Permission('platform.manage')
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.userService.findAllUsers(query);
  }

  @Get(':id')
  @Permission('platform.manage')
  findOne(@Param('id') id: string) {
    return this.userService.findUser(id);
  }

  @Patch(':id')
  @Permission('platform.manage')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.userService.updateUser(id, body, req.user.id);
  }

  @Delete(':id')
  @Permission('platform.manage')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.userService.deactivateUser(id, req.user.id);
  }

  @Put(':id/toggle-active')
  @Permission('platform.manage')
  toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.userService.toggleUserActive(id, req.user.id);
  }

  @Post(':id/impersonate')
  @Permission('platform.manage')
  impersonate(@Param('id') id: string, @Request() req: any) {
    return this.userService.impersonateUser(id, req.user.id);
  }

  @Post(':id/force-logout')
  @Permission('platform.manage')
  forceLogout(@Param('id') id: string, @Request() req: any) {
    return this.userService.forceLogoutUser(id, req.user.id);
  }

  @Get(':id/sessions')
  @Permission('platform.manage')
  getSessions(@Param('id') id: string) {
    return this.userService.getUserSessions(id);
  }
}
