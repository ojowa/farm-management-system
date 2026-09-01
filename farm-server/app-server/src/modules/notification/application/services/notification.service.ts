import { Inject,  Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest } from '../../presentation/dto/notification.dto';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationGateway } from '../../infrastructure/messaging/notification-gateway';
import { EmailService } from '../../modules/email/email.service';
import { PushService } from '../../modules/push/push.service';
import { scopedPrisma } from '@farm/database';

@Injectable()
export class NotificationApplicationService {
  private readonly logger = new Logger(NotificationApplicationService.name);

  constructor(@Inject('NotificationRepository') private readonly repository: NotificationRepository, 
    private readonly gateway: NotificationGateway, 
    private readonly emailService: EmailService, 
    private readonly pushService: PushService, 
  ) {}

  async create(createDto: CreateNotificationRequest): Promise<Notification> {
    const notification = await this.repository.create(createDto);
    this.gateway.sendToUser(createDto.userId, 'notification:new', notification);

    this.triggerExternalNotifications(createDto).catch((error) => {
      this.logger.error('Failed to trigger external notifications:', error);
    });

    return notification;
  }

  private async triggerExternalNotifications(dto: CreateNotificationRequest): Promise<void> {
    const user = await scopedPrisma.user.findUnique({
      where: { id: dto.userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      this.logger.warn(`User ${dto.userId} not found for external notifications`);
      return;
    }

    const userName = `${user.firstName} ${user.lastName}`;

    if (user.email) {
      await this.sendEmailNotification(user.email, userName, dto);
    }

    await this.sendPushNotification(dto.userId, dto);
  }

  private async sendEmailNotification(
    userEmail: string,
    userName: string,
    dto: CreateNotificationRequest
  ): Promise<void> {
    try {
      if (dto.entityType === 'LeaveRequest') {
        if (dto.type === 'SUCCESS') {
          await this.emailService.sendLeaveStatus(userEmail, userName, 'Leave', 'APPROVED', 0, '', '');
        } else if (dto.type === 'ALERT') {
          await this.emailService.sendLeaveStatus(userEmail, userName, 'Leave', 'REJECTED', 0, '', '');
        }
      } else if (dto.entityType === 'Message') {
        await this.emailService.sendEmail({
          to: userEmail,
          subject: dto.title,
          html: `<p>Hello ${userName},</p><p>${dto.message}</p>`,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send email notification:', error);
    }
  }

  private async sendPushNotification(
    userId: string,
    dto: CreateNotificationRequest
  ): Promise<void> {
    try {
      if (dto.entityType === 'LeaveRequest') {
        if (dto.type === 'SUCCESS') {
          await this.pushService.sendLeaveApprovalPush(userId, 'Leave', 0);
        } else if (dto.type === 'ALERT') {
          await this.pushService.sendLeaveRejectionPush(userId, 'Leave', 0);
        }
      } else if (dto.entityType === 'Message') {
        await this.pushService.sendNewMessagePush(
          userId,
          'System',
          dto.title,
          dto.type === 'ALERT' ? 'URGENT' : 'NORMAL'
        );
      }
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
    }
  }

  async findById(id: string): Promise<Notification> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    return this.repository.findByUserId(userId, options);
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return this.repository.findAll(options);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findById(id);
    const updated = await this.repository.markAsRead(id);
    this.gateway.sendToUser(notification.userId, 'notification:read', updated);
    return updated;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);
    this.gateway.sendToUser(userId, 'notification:all-read', { count });
    return count;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }

  async createBulk(notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    const created: Notification[] = [];
    for (const dto of notifications) {
      const notification = await this.repository.create(dto);
      created.push(notification);
      this.gateway.sendToUser(dto.userId, 'notification:new', notification);
    }
    return created;
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    await this.findById(id);
    return this.repository.update(id, data);
  }
}
