import { Inject,  Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { CreateNotificationRequest, UpdateNotificationRequest } from '../../presentation/dto/notification.dto';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationGateway } from '../../infrastructure/messaging/notification-gateway';
import { EmailService } from '../../modules/email/email.service';
import { PushService } from '../../modules/push/push.service';
import { scopedPrisma } from '../../../../kernel/database';

/** Leave details resolved from `entityId` for email/push copy. */
interface LeaveExternalContext {
  leaveTypeName: string;
  days: number;
  startDate: string;
  endDate: string;
  rejectionReason: string | null;
}

@Injectable()
export class NotificationApplicationService {
  private readonly logger = new Logger(NotificationApplicationService.name);

  constructor(@Inject('NotificationRepository') private readonly repository: NotificationRepository, 
    private readonly gateway: NotificationGateway, 
    private readonly emailService: EmailService, 
    private readonly pushService: PushService, 
  ) {}

  /**
   * A tenant may only deliver notifications to users inside its own org.
   *
   * Platform-scoped principals (no organizationId on the verified JWT — e.g.
   * a platform admin broadcasting to an org) are allowed through: every
   * org-backed user JWT carries an organizationId, so an empty value never
   * comes from a tenant caller.
   */
  private async assertTargetsInOrg(userIds: string[], organizationId: string): Promise<void> {
    if (!organizationId) return;
    const unique = [...new Set(userIds)];
    const allowed = new Set(await this.repository.filterUserIdsInOrg(unique, organizationId));
    const blocked = unique.filter((id) => !allowed.has(id));
    if (blocked.length) {
      throw new ForbiddenException(
        `Cannot create notifications for users outside your organization: ${blocked.join(', ')}`
      );
    }
  }

  async create(createDto: CreateNotificationRequest, organizationId: string): Promise<Notification> {
    await this.assertTargetsInOrg([createDto.userId], organizationId);
    const notification = await this.repository.create(createDto);
    this.gateway.sendToUser(createDto.userId, 'notification:new', notification);

    this.triggerExternalNotifications(createDto).catch((error) => {
      this.logger.error('Failed to trigger external notifications:', error);
    });

    return notification;
  }

  /**
   * Email + push fan-out after a notification row is written.
   *
   * Honors the per-user preferences saved under Settings → Notifications
   * (`emailNotifications` / `pushNotifications`, default enabled) — they used
   * to be stored and never consulted.
   */
  private async triggerExternalNotifications(dto: CreateNotificationRequest): Promise<void> {
    const user = await scopedPrisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      this.logger.warn(`User ${dto.userId} not found for external notifications`);
      return;
    }

    const prefs = (user.notificationPreferences ?? {}) as Record<string, unknown>;
    const emailEnabled = prefs.emailNotifications !== false;
    const pushEnabled = prefs.pushNotifications !== false;
    if (!emailEnabled && !pushEnabled) return;

    const userName = `${user.firstName} ${user.lastName}`;
    const context = await this.loadExternalContext(dto);

    if (emailEnabled && user.email) {
      await this.sendEmailNotification(user.email, userName, dto, context);
    }

    if (pushEnabled) {
      await this.sendPushNotification(dto.userId, dto, context);
    }
  }

  /**
   * Leave notifications carry only an entityId, but the email/push copy needs
   * the real leave type, duration and dates — resolve them once here instead
   * of shipping the old "Leave / 0 days / empty dates" placeholders.
   */
  private async loadExternalContext(
    dto: CreateNotificationRequest
  ): Promise<{ leave?: LeaveExternalContext }> {
    if (dto.entityType !== 'LeaveRequest' || !dto.entityId) return {};
    try {
      const leave = await scopedPrisma.leaveRequest.findUnique({
        where: { id: dto.entityId },
        include: { leaveType: true },
      });
      if (!leave) return {};
      const formatDate = (value: Date | string) =>
        new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      return {
        leave: {
          leaveTypeName: leave.leaveType?.name || 'Leave',
          days: leave.days,
          startDate: formatDate(leave.startDate),
          endDate: formatDate(leave.endDate),
          rejectionReason: leave.rejectionReason,
        },
      };
    } catch (error) {
      this.logger.warn(`Could not load leave context for ${dto.entityId}: ${(error as Error).message}`);
      return {};
    }
  }

  private async sendEmailNotification(
    userEmail: string,
    userName: string,
    dto: CreateNotificationRequest,
    context: { leave?: LeaveExternalContext }
  ): Promise<void> {
    try {
      if (dto.entityType === 'LeaveRequest') {
        const status = dto.type === 'SUCCESS' ? 'APPROVED' : dto.type === 'ALERT' ? 'REJECTED' : null;
        // INFO rows (e.g. "new request waiting for approval") stay in-app only.
        if (status) {
          const leave = context.leave;
          await this.emailService.sendLeaveStatus(
            userEmail,
            userName,
            leave?.leaveTypeName ?? 'Leave',
            status,
            leave?.days ?? 0,
            leave?.startDate ?? '',
            leave?.endDate ?? '',
            leave?.rejectionReason ?? undefined
          );
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
    dto: CreateNotificationRequest,
    context: { leave?: LeaveExternalContext }
  ): Promise<void> {
    try {
      if (dto.entityType === 'LeaveRequest' && dto.type === 'SUCCESS') {
        await this.pushService.sendLeaveApprovalPush(
          userId,
          context.leave?.leaveTypeName ?? 'Leave',
          context.leave?.days ?? 0
        );
      } else if (dto.entityType === 'LeaveRequest' && dto.type === 'ALERT') {
        await this.pushService.sendLeaveRejectionPush(
          userId,
          context.leave?.leaveTypeName ?? 'Leave',
          context.leave?.days ?? 0
        );
      } else if (dto.entityType === 'Message') {
        await this.pushService.sendNewMessagePush(
          userId,
          'System',
          dto.title,
          dto.type === 'ALERT' ? 'URGENT' : 'NORMAL'
        );
      } else {
        // Everything else reaches the device too — push used to fire only for
        // LeaveRequest/Message rows, so task/leave-approval/alert notifications
        // never left the server.
        await this.pushService.sendToUser(userId, {
          title: dto.title,
          body: dto.message,
          data: {
            type: 'notification',
            link: dto.link || '',
            entityType: dto.entityType || '',
            entityId: dto.entityId || '',
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
    }
  }

  async findById(id: string, userId: string): Promise<Notification> {
    const notification = await this.repository.findById(id, userId);
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

  async findAll(userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return this.repository.findAll(userId, options);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repository.markAsRead(id, userId);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    this.gateway.sendToUser(notification.userId, 'notification:read', notification);
    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);
    this.gateway.sendToUser(userId, 'notification:all-read', { count });
    return count;
  }

  async delete(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.delete(id, userId);
    if (!deleted) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    this.gateway.sendToUser(userId, 'notification:deleted', { id });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }

  async createBulk(notifications: CreateNotificationRequest[], organizationId: string): Promise<Notification[]> {
    await this.assertTargetsInOrg(notifications.map((dto) => dto.userId), organizationId);
    const created: Notification[] = [];
    for (const dto of notifications) {
      const notification = await this.repository.create(dto);
      created.push(notification);
      this.gateway.sendToUser(dto.userId, 'notification:new', notification);

      // Bulk items get the same email/push treatment as single creates.
      this.triggerExternalNotifications(dto).catch((error) => {
        this.logger.error('Failed to trigger external notifications:', error);
      });
    }
    return created;
  }

  async update(id: string, userId: string, data: UpdateNotificationRequest): Promise<Notification> {
    const updated = await this.repository.update(id, userId, data);
    if (!updated) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    this.gateway.sendToUser(userId, updated.read ? 'notification:read' : 'notification:updated', updated);
    return updated;
  }
}
