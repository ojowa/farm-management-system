import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { AuthorizationGuard, JwtAuthGuard } from '@farm/auth';
import { ZodValidationPipe } from '@farm/utils';
import { loginSchema, registerSchema } from '@farm/validation';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public endpoints: no guards applied.
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: 'Login successful' })
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ApiOperation({ summary: 'Register' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: 'Registration successful' })
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Token refreshed' })
  async refresh(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  // Protected: must be authenticated to view the profile.
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Authenticated user' })
  getProfile(@Request() req: any) {
    return req.user;
  }
}

