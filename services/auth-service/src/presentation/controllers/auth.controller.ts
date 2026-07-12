import { Controller, Post, Get, Put, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common';

import { AuthService } from '../../application/services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    return this.authService.login(body, ctx);
  }

  @Post('verify-mfa')
  async verifyMFA(@Body() body: { mfaToken: string; code: string }, @Req() req: any) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    return this.authService.verifyMFA(body.mfaToken, body.code, ctx);
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; firstName: string; lastName: string; organizationId?: string }, @Req() req: any) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    return this.authService.register(body, ctx);
  }

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user?.sub);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string; phone?: string; avatar?: string }) {
    return this.authService.updateProfile(req.user?.sub, body);
  }

  @Put('password')
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user?.sub, body.currentPassword, body.newPassword);
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    return this.authService.getNotificationPreferences(req.user?.sub);
  }

  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() body: any) {
    return this.authService.updateNotificationPreferences(req.user?.sub, body);
  }

  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }, @Req() req: any) {
    return this.authService.refreshToken(body.refreshToken, { ipAddress: req.ip });
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: any) {
    await this.authService.logout(req.user?.sub);
    return { message: 'Logged out successfully' };
  }

  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.authService.getActiveSessions(req.user?.sub);
  }

  @Post('2fa/generate')
  async generate2fa(@Req() req: any) {
    return this.authService.enable2fa(req.user?.sub);
  }

  @Post('2fa/enable')
  async enable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.confirm2fa(req.user?.sub, body.code);
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  async disable2fa(@Req() req: any) {
    await this.authService.disable2fa(req.user?.sub);
    return { message: '2FA disabled successfully' };
  }
}
