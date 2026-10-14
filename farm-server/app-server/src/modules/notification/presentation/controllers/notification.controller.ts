import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { NotificationApplicationService } from '../../application/services/notification.service';
import { Notification } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest } from '../dto/notification.dto';
import { ZodValidationPipe } from '@farm/utils';
import { createNotificationSchema, updateNotificationSchema } from '@farm/validation-server';
import { DeviceTokenRepository } from '../../domain/repositories/notification.repository';

function getCallerUserId(req: any): string {
  return String(req.user?.sub || '');
}

/**
 * Notification rows belong to their receiving user (the table has no
 * organizationId), so the `user/:userId` routes are strictly self-service —
 * any other user's id reads as not-found.
 */
function requireSelfUserId(userId: string, req: any): string {
  const me = getCallerUserId(req);
  if (!me || userId !== me) {
    throw new NotFoundException('Notifications not found');
  }
  return me;
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationApplicationService) {}

  @Permission('notification.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async create(@Req() req: any, @Body() createDto: CreateNotificationRequest): Promise<Notification> {
    return this.notificationService.create(createDto, String(req.user?.organizationId || ''));
  }

  @Permission('notification.write')
  @Post('bulk')
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async createBulk(@Req() req: any, @Body() notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    return this.notificationService.createBulk(notifications, String(req.user?.organizationId || ''));
  }

  @Permission('notification.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Notification> {
    return this.notificationService.findById(id, getCallerUserId(req));
  }

  @Permission('notification.read')
  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Notification[]> {
    return this.notificationService.findByUserId(requireSelfUserId(userId, req), {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Permission('notification.read')
  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string, @Req() req: any): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(requireSelfUserId(userId, req));
    return { count };
  }

  @Permission('notification.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateNotificationSchema))
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: Partial<Notification>
  ): Promise<Notification> {
    return this.notificationService.update(id, getCallerUserId(req), updateDto);
  }

  @Permission('notification.write')
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any): Promise<Notification> {
    return this.notificationService.markAsRead(id, getCallerUserId(req));
  }

  @Permission('notification.write')
  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string, @Req() req: any): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(requireSelfUserId(userId, req));
    return { count };
  }

  @Permission('notification.write')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.notificationService.delete(id, getCallerUserId(req));
  }

  @Permission('notification.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Notification[]> {
    return this.notificationService.findAll(getCallerUserId(req), {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('devices')
export class DeviceController {
  constructor(@Inject('DeviceTokenRepository') private readonly deviceTokenRepo: DeviceTokenRepository) {}

  @Permission('notification.write')
  @Post('tokens')
  async registerToken(
    @Req() req: any,
    @Body() body: { token: string; platform: 'web' | 'ios' | 'android' }
  ): Promise<{ success: boolean; message: string }> {
    // Identity comes from the verified JWT only — a spoofable `x-user-id`
    // header must never decide which user's devices get push tokens.
    const userId = getCallerUserId(req);
    const { token, platform } = body;

    if (!token || !platform) {
      return { success: false, message: 'Token and platform are required' };
    }

    try {
      await this.deviceTokenRepo.register(userId, token, platform);
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
    const userId = getCallerUserId(req);
    const { token } = body;

    if (!token) {
      return { success: false, message: 'Token is required' };
    }

    try {
      await this.deviceTokenRepo.deactivateByToken(userId, token);
      return { success: true, message: 'Device token unregistered successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to unregister device token' };
    }
  }
}
