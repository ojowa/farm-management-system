import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL!;

interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  link?: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service': 'hr-service',
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function createBulkNotifications(payloads: CreateNotificationPayload[]): Promise<void> {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications/bulk`, payloads, {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service': 'hr-service',
      },
    });
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
  }
}
