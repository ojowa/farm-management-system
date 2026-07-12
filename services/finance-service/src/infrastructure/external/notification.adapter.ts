import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  metadata?: Record<string, unknown>;
}

export class NotificationAdapter {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = NOTIFICATION_SERVICE_URL;
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/notifications`, payload);
    } catch (error) {
      console.error('[NotificationAdapter] Failed to send notification:', error);
    }
  }

  async sendFinancialAlert(userId: string, title: string, message: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/notifications`, {
        userId,
        title,
        message,
        type: 'INFO',
      });
    } catch (error) {
      console.error('[NotificationAdapter] Failed to send financial alert:', error);
    }
  }
}
