import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { AuthService } from '../../application/services/auth.service';

/**
 * `/admin/users` account management used by the admin console.
 * (`AdminController` in this module already owns `/admin/organizations`.)
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('users')
  @Permission('users.manage')
  listUsers(@Req() req: any) {
    // Scoped to the caller's organization unless they are a platform admin.
    return this.authService.listAllUsers(req?.user);
  }

  @Put('users/:userId')
  @Permission('users.manage')
  updateUser(@Param('userId') userId: string, @Body() body: any, @Req() req: any) {
    return this.authService.updateUser(userId, body || {}, req?.user);
  }

  @Put('users/:userId/toggle-active')
  @Permission('users.manage')
  toggleActive(@Param('userId') userId: string, @Req() req: any) {
    return this.authService.toggleUserActive(userId, req?.user);
  }
}
