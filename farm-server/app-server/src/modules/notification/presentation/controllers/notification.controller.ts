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
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { NotificationApplicationService } from '../../application/services/notification.service';
import { Notification } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest, UpdateNotificationRequest } from '../dto/notification.dto';
import { ZodValidationPipe } from '@farm/utils';
import {
  createNotificationSchema,
  createBulkNotificationSchema,
  updateNotificationSchema,
  registerDeviceTokenSchema,
  unregisterDeviceTokenSchema,
} from '@farm/validation-server';
import { DeviceTokenRepository } from '../../domain/repositories/notification.repository';

/**
 * `JwtAuthGuard` stores the verified principal as `req.user` in the
 * `VerifiedUser` shape (`{ id, email, role, permissions, organizationId }`).
 * `sub` is only the raw JWT claim, so it is kept as a defensive fallback —
 * reading it alone used to leave every self-service route with an empty
 * caller id (404s everywhere and push tokens stored under `userId: ''`).
 */
function getCallerUserId(req: any): string {
  const user = req?.user;
  return String(user?.id ?? user?.sub ?? '');
}

function requireCallerUserId(req: any): string {
  const userId = getCallerUserId(req);
  if (!userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return userId;
}

/**
 * Notification rows belong to their receiving user (the table has no
 * organizationId), so the `user/:userId` routes are strictly self-service —
 * any other user's id reads as not-found.
 */
function requireSelfUserId(userId: string, req: any): string {
  const me = requireCallerUserId(req);
  if (userId !== me) {
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
  @UsePipes(new ZodValidationPipe(createBulkNotificationSchema))
  async createBulk(@Req() req: any, @Body() notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    return this.notificationService.createBulk(notifications, String(req.user?.organizationId || ''));
  }

  @Permission('notification.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Notification> {
    return this.notificationService.findById(id, requireCallerUserId(req));
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
    @Body() updateDto: UpdateNotificationRequest
  ): Promise<Notification> {
    return this.notificationService.update(id, requireCallerUserId(req), updateDto);
  }

  // Marking your own notifications read is self-service on rows you already
  // own, so it sits behind `notification.read` (read-only roles — accountant,
  // supervisor, worker — were locked out of their own inbox before).
  @Permission('notification.read')
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any): Promise<Notification> {
    return this.notificationService.markAsRead(id, requireCallerUserId(req));
  }

  @Permission('notification.read')
  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string, @Req() req: any): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(requireSelfUserId(userId, req));
    return { count };
  }

  @Permission('notification.write')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.notificationService.delete(id, requireCallerUserId(req));
  }

  @Permission('notification.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Notification[]> {
    return this.notificationService.findAll(requireCallerUserId(req), {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('devices')
export class DeviceController {
  constructor(@Inject('DeviceTokenRepository') private readonly deviceTokenRepo: DeviceTokenRepository) {}

  // Self-service: the row is always bound to the caller's own user id from
  // the verified JWT, so any role that receives notifications may bind its
  // push handle — gating this on `notification.write` silently denied push
  // to read-only roles (accountant, supervisor, worker).
  @Permission('notification.read')
  @Post('tokens')
  @UsePipes(new ZodValidationPipe(registerDeviceTokenSchema))
  async registerToken(
    @Req() req: any,
    @Body() body: { token: string; platform: 'web' | 'ios' | 'android' }
  ): Promise<{ success: boolean; message: string }> {
    // Identity comes from the verified JWT only — a spoofable `x-user-id`
    // header must never decide which user's devices get push tokens.
    const userId = requireCallerUserId(req);

    try {
      await this.deviceTokenRepo.register(userId, body.token, body.platform);
      return { success: true, message: 'Device token registered successfully' };
    } catch (error) {
      throw new InternalServerErrorException({ success: false, message: 'Failed to register device token' });
    }
  }

  @Permission('notification.read')
  @Delete('tokens')
  @UsePipes(new ZodValidationPipe(unregisterDeviceTokenSchema))
  async unregisterToken(
    @Req() req: any,
    @Body() body: { token: string }
  ): Promise<{ success: boolean; message: string }> {
    const userId = requireCallerUserId(req);

    try {
      await this.deviceTokenRepo.deactivateByToken(userId, body.token);
      return { success: true, message: 'Device token unregistered successfully' };
    } catch (error) {
      throw new InternalServerErrorException({ success: false, message: 'Failed to unregister device token' });
    }
  }
}
