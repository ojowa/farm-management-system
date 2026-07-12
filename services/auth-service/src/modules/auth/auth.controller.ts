import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res,
  HttpCode, HttpStatus, UsePipes, BadRequestException, UnauthorizedException,
  NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '@farm/utils';
import { loginSchema, registerSchema } from '@farm/validation';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.requiresMFA) {
      return { requiresMFA: true, mfaToken: result.mfaToken, user: result.user };
    }
    this.setAuthCookies(res, result.accessToken!, result.refreshToken!);
    return { requiresMFA: false, user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  async verifyMFA(@Body() body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const { mfaToken, code } = body;
    const result = await this.authService.verifyMFA(mfaToken, code, {
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ZodValidationPipe(registerSchema)) body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.register(body, {
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const token = refreshToken || req.cookies?.refreshToken;
    if (!token) throw new BadRequestException('Refresh token required');
    const wasReused = await this.authService.detectRefreshTokenReuse(token);
    if (wasReused) { this.clearAuthCookies(res); throw new UnauthorizedException('Token reuse detected. All sessions revoked.'); }
    const result = await this.authService.refreshToken(token, { ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      message: 'Token refreshed',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Get('me')
  async me(@Req() req: any) {
    const user = req.user;
    if (!user?.sub) return { message: 'Unauthenticated' };
    return prisma.user.findUnique({
      where: { id: user.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } }, organization: { include: { subscriptionPlanRef: true } } },
    });
  }

  @Get('profile')
  async getProfile(@Req() req: any) { return this.me(req); }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const { firstName, lastName, phone, email, avatar } = body;
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar || null;
    const updated = await prisma.user.update({
      where: { id: req.user.sub }, data: updateData,
      include: { role: { include: { permissions: { include: { permission: true } } } }, organization: { include: { subscriptionPlanRef: true } } },
    });
    const { passwordHash, twoFactorSecret, ...rest } = updated as any;
    return rest;
  }

  @Put('password')
  async changePassword(@Req() req: any, @Body() body: any, @Res({ passthrough: true }) res: any) {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) throw new BadRequestException('Current and new password are required');
    const fullUser = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!fullUser) throw new NotFoundException('User not found');
    const isValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.sub }, data: { passwordHash } });
    await this.authService.logoutAllSessions(req.user.sub);
    return { message: 'Password updated successfully' };
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    return prisma.user.findUnique({ where: { id: req.user.sub }, select: { notificationPreferences: true, twoFactorEnabled: true } });
  }

  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() body: any) {
    return prisma.user.update({ where: { id: req.user.sub }, data: { notificationPreferences: body.notificationPreferences }, select: { notificationPreferences: true, twoFactorEnabled: true } });
  }

  @Get('my-organizations')
  async myOrganizations(@Req() req: any) {
    const memberships = await prisma.userOrganization.findMany({
      where: { userId: req.user.sub, isActive: true }, include: { organization: true }, orderBy: { isDefault: 'desc' },
    });
    return memberships.map((m: any) => ({ ...m.organization, roleInOrg: m.roleInOrg, isDefault: m.isDefault, membershipId: m.id }));
  }

  @Post('switch-organization')
  @HttpCode(HttpStatus.OK)
  async switchOrganization(@Req() req: any, @Body('organizationId') organizationId: string, @Res({ passthrough: true }) res: any) {
    if (!organizationId) throw new BadRequestException('organizationId required');
    const membership = await prisma.userOrganization.findUnique({ where: { userId_organizationId: { userId: req.user.sub, organizationId } } });
    if (!membership || !membership.isActive) throw new ForbiddenException('Not a member of this organization');
    const fullUser = await prisma.user.findUnique({ where: { id: req.user.sub }, include: { role: { include: { permissions: { include: { permission: true } } } }, organization: { include: { subscriptionPlanRef: true } } } });
    if (!fullUser) throw new NotFoundException('User not found');
    const accessToken = await this.authService.generateAccessToken({ ...fullUser, organizationId });
    const refreshToken = await this.authService.generateRefreshToken(req.user.sub, { ipAddress: req.ip });
    this.setAuthCookies(res, accessToken, refreshToken);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = fullUser as any;
    userWithoutPassword.organizationId = organizationId;
    userWithoutPassword.organization = await prisma.organization.findUnique({ where: { id: organizationId }, include: { subscriptionPlanRef: true } });
    return { user: userWithoutPassword };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.authService.logout(req.user.sub);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Post('2fa/generate')
  async generate2FASecret(@Req() req: any) {
    const fullUser = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!fullUser) return { message: 'User not found' };
    if (fullUser.twoFactorEnabled) return { message: '2FA is already enabled' };
    const { generateTOTPSecret } = await import('./totp');
    return generateTOTPSecret(req.user.sub, fullUser.email || '');
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enable2FA(@Req() req: any, @Body('code') code: string) {
    const { enable2FA } = await import('./totp');
    await enable2FA(req.user.sub, code);
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disable2FA(@Req() req: any, @Body('code') code: string) {
    const { disable2FA } = await import('./totp');
    await disable2FA(req.user.sub, code);
    return { message: '2FA disabled successfully' };
  }

  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.authService.getActiveSessions(req.user.sub);
  }

  @Delete('sessions/:tokenId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Req() req: any, @Param('tokenId') tokenId: string) {
    await this.authService.revokeSession(req.user.sub, tokenId);
    return { message: 'Session revoked' };
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Req() req: any) {
    await this.authService.logoutAllSessions(req.user.sub);
    return { message: 'All sessions revoked' };
  }

  private setAuthCookies(res: any, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 15 * 60 * 1000, path: '/' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
  }

  private clearAuthCookies(res: any) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }
}
