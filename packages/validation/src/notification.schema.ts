import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['INFO', 'WARNING', 'ALERT', 'SUCCESS']).optional(),
  link: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const updateNotificationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000).optional(),
  type: z.enum(['INFO', 'WARNING', 'ALERT', 'SUCCESS']).optional(),
  link: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  read: z.boolean().optional(),
});