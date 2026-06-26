import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification, CreateNotificationRequest } from '@farm/types';
import { ZodValidationPipe } from '@farm/utils';
import { createNotificationSchema, updateNotificationSchema } from '@farm/validation';
import {
  AuthorizationGuard,
  JwtAuthGuard,
  Roles,
  Permission,
} from '@farm/auth';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER')
  @Permission('notification.write')
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async create(@Body() createDto: CreateNotificationRequest): Promise<Notification> {
    return this.notificationService.create(createDto);
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER')
  @Permission('notification.write')
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async createBulk(@Body() notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    return this.notificationService.createBulk(notifications);
  }

  @Get(':id')
  @Permission('notification.read')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findById(id);
  }

  @Get('user/:userId')
  @Permission('notification.read')
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

  @Get('user/:userId/unread-count')
  @Permission('notification.read')
  async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id')
  @Permission('notification.write')
  @UsePipes(new ZodValidationPipe(updateNotificationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Notification>
  ): Promise<Notification> {
    return this.notificationService.findById(id).then(() =>
      this.notificationService.update(id, updateDto)
    );
  }

  @Put(':id/read')
  @Permission('notification.read')
  async markAsRead(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.markAsRead(id);
  }

  @Put('user/:userId/read-all')
  @Permission('notification.read')
  async markAllAsRead(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(userId);
    return { count };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER')
  @Permission('notification.write')
  async delete(@Param('id') id: string): Promise<void> {
    return this.notificationService.delete(id);
  }

  @Get()
  @Permission('notification.read')
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
