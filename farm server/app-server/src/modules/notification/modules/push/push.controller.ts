import {
  Controller,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { PushService } from './push.service';
import { scopedPrisma as prisma } from '@farm/database';

interface RegisterDeviceTokenRequest {
  token: string;
  platform: 'web' | 'ios' | 'android';
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('devices')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Permission('notification.write')
  @Post('tokens')
  async registerToken(
    @Req() req: any,
    @Body() body: RegisterDeviceTokenRequest
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.sub || req.headers['x-user-id'];
    const { token, platform } = body;

    if (!token || !platform) {
      return { success: false, message: 'Token and platform are required' };
    }

    try {
      const existing = await prisma.deviceToken.findFirst({
        where: { userId, token },
      });

      if (existing) {
        await prisma.deviceToken.update({
          where: { id: existing.id },
          data: { active: true },
        });
      } else {
        await prisma.deviceToken.create({
          data: { userId, token, platform },
        });
      }

      return { success: true, message: 'Device token registered successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to register device token' };
    }
  }

  @Permission('notification.write')
  @Delete('tokens')
  async unregisterToken(
    @Req() req: any,
    @Body() body: { token: string }
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.sub || req.headers['x-user-id'];
    const { token } = body;

    if (!token) {
      return { success: false, message: 'Token is required' };
    }

    try {
      await prisma.deviceToken.updateMany({
        where: { userId, token },
        data: { active: false },
      });

      return { success: true, message: 'Device token unregistered successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to unregister device token' };
    }
  }
}
