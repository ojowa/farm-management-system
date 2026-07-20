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
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { NotificationApplicationService } from '../../application/services/notification.service';
import { Notification } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest } from '../dto/notification.dto';
import { ZodValidationPipe } from '@farm/utils';
import { createNotificationSchema, updateNotificationSchema } from '@farm/validation';
import { DeviceTokenRepository } from '../../domain/repositories/notification.repository';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationApplicationService) {}

  @Permission('notification.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async create(@Body() createDto: CreateNotificationRequest): Promise<Notification> {
    return this.notificationService.create(createDto);
  }

  @Permission('notification.write')
  @Post('bulk')
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async createBulk(@Body() notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    return this.notificationService.createBulk(notifications);
  }

  @Permission('notification.read')
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findById(id);
  }

  @Permission('notification.read')
  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Notification[]> {
    return this.notificationService.findByUserId(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Permission('notification.read')
  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Permission('notification.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateNotificationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Notification>
  ): Promise<Notification> {
    return this.notificationService.update(id, updateDto);
  }

  @Permission('notification.write')
  @Put(':id/read')
  async markAsRead(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.markAsRead(id);
  }

  @Permission('notification.write')
  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(userId);
    return { count };
  }

  @Permission('notification.write')
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.notificationService.delete(id);
  }

  @Permission('notification.read')
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Notification[]> {
    return this.notificationService.findAll({
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
    const userId = req.user?.sub || req.headers['x-user-id'];
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
    const userId = req.user?.sub || req.headers['x-user-id'];
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
