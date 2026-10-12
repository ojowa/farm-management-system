import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceTokenRepository } from '../../domain/repositories/notification.repository';

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
  private readonly expoAccessToken: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    @Inject('DeviceTokenRepository') private readonly deviceTokenRepo: DeviceTokenRepository,
  ) {
    this.expoAccessToken = this.configService.get('EXPO_ACCESS_TOKEN');
    if (!this.expoAccessToken) {
      this.logger.warn('EXPO_ACCESS_TOKEN not configured — push notifications will be logged only');
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const tokens = await this.deviceTokenRepo.findByUserId(userId);

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
    if (this.expoAccessToken) {
      const message = {
        to: token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge ? parseInt(payload.badge, 10) : undefined,
        data: payload.data,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.expoAccessToken ? { Authorization: `Bearer ${this.expoAccessToken}` } : {}),
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Expo push failed (${response.status}): ${errorText}`);
      }

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
    const message = error?.message || '';
    return message.includes('InvalidCredentials') ||
           message.includes('DeviceNotRegistered') ||
           message.includes('MessageTooBig') ||
           message.includes('MessageRateExceeded');
  }

  private async deactivateToken(tokenId: string): Promise<void> {
    try {
      await this.deviceTokenRepo.deactivate(tokenId);
      this.logger.log(`Deactivated invalid token: ${tokenId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate token ${tokenId}:`, error);
    }
  }
}
