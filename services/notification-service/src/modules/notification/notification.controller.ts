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
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification, CreateNotificationRequest } from '@farm/types';
import { ZodValidationPipe } from '@farm/utils';
import { createNotificationSchema, updateNotificationSchema } from '@farm/validation';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async create(@Body() createDto: CreateNotificationRequest): Promise<Notification> {
    return this.notificationService.create(createDto);
  }

  @Post('bulk')
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async createBulk(@Body() notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    return this.notificationService.createBulk(notifications);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findById(id);
  }

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

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id')
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
  async markAsRead(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.markAsRead(id);
  }

  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(userId);
    return { count };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.notificationService.delete(id);
  }

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
