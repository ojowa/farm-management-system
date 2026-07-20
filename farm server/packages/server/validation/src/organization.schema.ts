import { z } from 'zod';

export const organizationSettingsSchema = z.object({
  currency: z.string().length(3),
  timezone: z.string(),
  language: z.string().length(2),
  measurementUnit: z.enum(['METRIC', 'IMPERIAL']),
  dateFormat: z.string(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  subscriptionPlan: z.string().optional(),
  settings: organizationSettingsSchema.optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  settings: organizationSettingsSchema.optional(),
});
