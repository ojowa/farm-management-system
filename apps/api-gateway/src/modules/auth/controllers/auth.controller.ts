import { Controller, Post, Body, Get, UseGuards, Request, UsePipes } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ZodValidationPipe } from '@farm/utils';
import { loginSchema, registerSchema } from '@farm/validation';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('refresh')
  async refresh(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
