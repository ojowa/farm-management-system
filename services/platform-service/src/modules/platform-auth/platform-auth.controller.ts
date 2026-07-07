import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Controller('platform-auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.platformAuthService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.platformAuthService.refresh(body.refreshToken);
  }

  @Get('me')
  @UseGuards(PlatformAdminGuard)
  async getMe(@Request() req: any) {
    return this.platformAuthService.getMe(req.platformUser.id);
  }
}
