import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL!;

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
}

const FARM_SERVICE_URL = process.env.FARM_SERVICE_URL!;

export class LivestockAdapter {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = FARM_SERVICE_URL;
  }

  async getLivestockHealth(livestockId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/livestock/health/livestock/${livestockId}`);
      return response.data;
    } catch (error) {
      console.error('[LivestockAdapter] Failed to get livestock health:', error);
      return null;
    }
  }
}
