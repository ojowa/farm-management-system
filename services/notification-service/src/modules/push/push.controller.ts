import {
  Controller,
  Post,
  Delete,
  Body,
  Req,
} from '@nestjs/common';
import { PushService } from './push.service';
import { scopedPrisma as prisma } from '@farm/database';

interface RegisterDeviceTokenRequest {
  token: string;
  platform: 'web' | 'ios' | 'android';
}

@Controller('devices')
export class PushController {
  constructor(private readonly pushService: PushService) {}

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
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "DeviceToken" WHERE "userId" = $1 AND token = $2`,
        userId, token
      );

      if (existing && existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "DeviceToken" SET active = true, "updatedAt" = NOW() WHERE id = $1`,
          existing[0].id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "DeviceToken" (id, "userId", token, platform, active, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, true, NOW(), NOW())`,
          userId, token, platform
        );
      }

      return { success: true, message: 'Device token registered successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to register device token' };
    }
  }

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
      await prisma.$executeRawUnsafe(
        `UPDATE "DeviceToken" SET active = false, "updatedAt" = NOW() WHERE "userId" = $1 AND token = $2`,
        userId, token
      );

      return { success: true, message: 'Device token unregistered successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to unregister device token' };
    }
  }
}
