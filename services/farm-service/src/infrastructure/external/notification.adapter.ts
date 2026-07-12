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
}

const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:4006';

export class FinanceAdapter {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = FINANCE_SERVICE_URL;
  }

  async getFarmExpenses(farmId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/finance/expenses`, { params: { farmId } });
      return response.data;
    } catch (error) {
      console.error('[FinanceAdapter] Failed to get farm expenses:', error);
      return [];
    }
  }

  async getFarmSales(farmId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/finance/sales`, { params: { farmId } });
      return response.data;
    } catch (error) {
      console.error('[FinanceAdapter] Failed to get farm sales:', error);
      return [];
    }
  }
}
