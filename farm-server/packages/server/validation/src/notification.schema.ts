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
  /** @deprecated legacy alias for `read`; kept so older API callers still work. */
  isRead: z.boolean().optional(),
});

const bulkNotificationArraySchema = z.array(createNotificationSchema).min(1).max(200);

/**
 * Bulk create accepts either a bare array of notifications or the documented
 * `{ notifications: [...] }` wrapper — validating an array body against the
 * single-object schema used to fail every bulk request with a 400.
 */
export const createBulkNotificationSchema = z
  .union([
    z.object({ notifications: bulkNotificationArraySchema }),
    bulkNotificationArraySchema,
  ])
  .transform((value) => ('notifications' in value ? value.notifications : value));

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(1).max(1024),
  platform: z.enum(['web', 'ios', 'android']),
});

export const unregisterDeviceTokenSchema = z.object({
  token: z.string().min(1).max(1024),
});