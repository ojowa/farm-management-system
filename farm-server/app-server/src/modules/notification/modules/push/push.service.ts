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
      // Skip malformed rows (e.g. web handles stored before push existed) —
      // Expo rejects them and the old code deactivated nothing, looping 500s.
      if (!device.token || !device.token.startsWith('ExponentPushToken[')) {
        this.logger.debug(`Skipping non-Expo token for user ${userId} (device ${device.id})`);
        continue;
      }
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
    // Expo's push API accepts unauthenticated sends for low volume; the
    // access token only raises rate limits. Gate on nothing so push works
    // out of the box — with or without EXPO_ACCESS_TOKEN.
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
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(this.expoAccessToken ? { Authorization: `Bearer ${this.expoAccessToken}` } : {}),
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo push failed (${response.status}): ${errorText}`);
    }

    const ticket: any = await response.json().catch(() => null);
    const status = ticket?.data?.status;
    if (status && status !== 'ok') {
      const details = ticket?.data?.message ?? ticket?.data?.details ?? JSON.stringify(ticket?.data);
      throw new Error(`Expo push ticket ${status}: ${details}`);
    }

    this.logger.debug(`Push notification sent to ${token.substring(0, 10)}...`);
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
    days: number,
    notificationId?: string
  ): Promise<number> {
    return this.sendToUser(userId, {
      title: 'Leave Approved',
      body: `Your ${leaveType} request for ${days} day(s) has been approved.`,
      icon: '/icons/success-icon.png',
      data: {
        type: 'leave-approved',
        link: '/hr/leave',
        // Tap handlers mark the row read via this id — absent, the badge
        // stayed out of step until the Notifications screen was opened.
        notificationId: notificationId || '',
      },
    });
  }

  async sendLeaveRejectionPush(
    userId: string,
    leaveType: string,
    days: number,
    notificationId?: string
  ): Promise<number> {
    return this.sendToUser(userId, {
      title: 'Leave Rejected',
      body: `Your ${leaveType} request for ${days} day(s) has been rejected.`,
      icon: '/icons/alert-icon.png',
      data: {
        type: 'leave-rejected',
        link: '/hr/leave',
        notificationId: notificationId || '',
      },
    });
  }

  async sendNewMessagePush(
    userId: string,
    senderName: string,
    subject: string,
    priority: string,
    notificationId?: string
  ): Promise<number> {
    const priorityPrefix = priority === 'URGENT' ? '[URGENT] ' : priority === 'HIGH' ? '[HIGH] ' : '';
    return this.sendToUser(userId, {
      title: `${priorityPrefix}New message from ${senderName}`,
      body: subject,
      icon: '/icons/message-icon.png',
      data: {
        type: 'new-message',
        link: '/messages',
        notificationId: notificationId || '',
      },
    });
  }

  private isTokenInvalid(error: any): boolean {
    const message = String(error?.message || '');
    return message.includes('DeviceNotRegistered') ||
           message.includes('"status":"error"') ||
           message.includes('Expo push ticket error') ||
           message.includes('InvalidCredentials') ||
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
