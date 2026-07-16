import { Controller, Post, Get, Put, Body, Req, Res, UseGuards, HttpCode, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

import { AuthService } from '../../application/services/auth.service';
import { JwtAuthGuard, AuthorizationGuard } from '@farm/auth/nestjs';
import { LoginDto, RegisterDto, RefreshTokenDto, VerifyMfaDto, ChangePasswordDto, UpdateProfileDto } from '../dto/auth.dto';

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/' };
const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() body: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await this.authService.login(body, ctx);

    if (result.accessToken && result.refreshToken) {
      res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
      res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE });
    }

    return result;
  }

  @Post('verify-mfa')
  @Throttle({ default: { ttl: 300000, limit: 5 } })
  async verifyMFA(@Body() body: VerifyMfaDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await this.authService.verifyMFA(body.mfaToken, body.code, ctx);

    if (result.accessToken && result.refreshToken) {
      res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
      res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE });
    }

    return result;
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(@Body() body: RegisterDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const ctx = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await this.authService.register(body, ctx);

    if (result.accessToken && result.refreshToken) {
      res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
      res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE });
    }

    return result;
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async refreshToken(@Body() body: RefreshTokenDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken || body?.refreshToken;

    // Detect refresh token reuse — if a revoked token is presented, revoke
    // all sessions for the user to prevent token theft.
    if (refreshToken) {
      const isReused = await this.authService.detectRefreshTokenReuse(refreshToken);
      if (isReused) {
        // Token was reused after rotation — this indicates potential theft.
        // Revoke all sessions and clear cookies.
        try {
          const payload = require('jsonwebtoken').decode(refreshToken) as any;
          if (payload?.sub) {
            await this.authService.logoutAllSessions(payload.sub);
          }
        } catch {}
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        return { error: 'Refresh token reuse detected. All sessions revoked.' };
      }
    }

    const result = await this.authService.refreshToken(refreshToken, { ipAddress: req.ip });

    if (result.accessToken && result.refreshToken) {
      res.cookie('accessToken', result.accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
      res.cookie('refreshToken', result.refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE });
    }

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user?.sub);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(req.user?.sub, body);
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user?.sub, body.currentPassword, body.newPassword);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Req() req: any) {
    return this.authService.getNotificationPreferences(req.user?.sub);
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(@Req() req: any, @Body() body: any) {
    return this.authService.updateNotificationPreferences(req.user?.sub, body);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user?.sub);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Req() req: any) {
    return this.authService.getActiveSessions(req.user?.sub);
  }

  @Delete('sessions/:tokenId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Req() req: any, @Req() req2: any) {
    await this.authService.revokeSession(req2.user?.sub, req2.params.tokenId);
    return { message: 'Session revoked' };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@Req() req: any) {
    await this.authService.logoutAllSessions(req.user?.sub);
    return { message: 'All sessions revoked' };
  }

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async generate2fa(@Req() req: any) {
    return this.authService.enable2fa(req.user?.sub);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.confirm2fa(req.user?.sub, body.code);
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2fa(@Req() req: any, @Body() body: { code: string }) {
    if (!body.code || body.code.length !== 6) {
      return { error: 'A valid 6-digit TOTP code is required to disable 2FA' };
    }
    await this.authService.disable2fa(req.user?.sub, body.code);
    return { message: '2FA disabled successfully' };
  }
}
