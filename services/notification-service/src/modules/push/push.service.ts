import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { scopedPrisma as prisma } from '@farm/database';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private fcmInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeFCM();
  }

  private initializeFCM(): void {
    const projectId = this.configService.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      try {
        this.fcmInitialized = true;
        this.logger.log('Firebase Cloud Messaging initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase:', error);
      }
    } else {
      this.logger.warn('Firebase not configured - push notifications will be logged only');
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const tokens = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, token FROM "DeviceToken" WHERE "userId" = $1 AND active = true`,
      userId
    );

    if (!tokens || tokens.length === 0) {
      this.logger.debug(`No device tokens found for user ${userId}`);
      return 0;
    }

    let successCount = 0;
    for (const device of tokens) {
      try {
        await this.sendToDevice(device.token, payload);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to send push to device ${device.id}:`, error);
        if (this.isTokenInvalid(error)) {
          await this.deactivateToken(device.id);
        }
      }
    }

    return successCount;
  }

  async sendToDevice(token: string, payload: PushPayload): Promise<void> {
    if (this.fcmInitialized) {
      const admin = await import('firebase-admin');

      const message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
        },
        data: payload.data,
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/notification-icon.png',
            badge: payload.badge || '/icons/badge-icon.png',
            vibrate: [100, 50, 100],
            actions: [
              { action: 'open', title: 'Open' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.debug(`Push notification sent to ${token.substring(0, 10)}...`);
    } else {
      this.logger.log(`[PUSH LOG] To: ${token.substring(0, 10)}... | Title: ${payload.title}`);
    }
  }

  async sendBulkNotifications(userIds: string[], payload: PushPayload): Promise<number> {
    let totalCount = 0;
    for (const userId of userIds) {
      const count = await this.sendToUser(userId, payload);
      totalCount += count;
    }
    return totalCount;
  }

  async sendLeaveApprovalPush(
    userId: string,
    leaveType: string,
    days: number
  ): Promise<number> {
    return this.sendToUser(userId, {
      title: 'Leave Approved',
      body: `Your ${leaveType} request for ${days} day(s) has been approved.`,
      icon: '/icons/success-icon.png',
      data: { type: 'leave-approved', link: '/hr/leave' },
    });
  }

  async sendLeaveRejectionPush(
    userId: string,
    leaveType: string,
    days: number
  ): Promise<number> {
    return this.sendToUser(userId, {
      title: 'Leave Rejected',
      body: `Your ${leaveType} request for ${days} day(s) has been rejected.`,
      icon: '/icons/alert-icon.png',
      data: { type: 'leave-rejected', link: '/hr/leave' },
    });
  }

  async sendNewMessagePush(
    userId: string,
    senderName: string,
    subject: string,
    priority: string
  ): Promise<number> {
    const priorityPrefix = priority === 'URGENT' ? '[URGENT] ' : priority === 'HIGH' ? '[HIGH] ' : '';
    return this.sendToUser(userId, {
      title: `${priorityPrefix}New message from ${senderName}`,
      body: subject,
      icon: '/icons/message-icon.png',
      data: { type: 'new-message', link: '/messages' },
    });
  }

  private isTokenInvalid(error: any): boolean {
    return error?.code === 'messaging/registration-token-not-registered' ||
           error?.code === 'messaging/invalid-registration-token';
  }

  private async deactivateToken(tokenId: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "DeviceToken" SET active = false, "updatedAt" = NOW() WHERE id = $1`,
        tokenId
      );
      this.logger.log(`Deactivated invalid token: ${tokenId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate token ${tokenId}:`, error);
    }
  }
}
