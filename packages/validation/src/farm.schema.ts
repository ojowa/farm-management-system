import { z } from 'zod';

export const createFarmSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2),
  location: z.string().min(2).nullable().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  size: z.number().min(0).optional().default(0),
  status: z.string().optional().default('active'),
});

export const updateFarmSchema = z.object({
  organizationId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  location: z.string().min(2).nullable().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  size: z.number().min(0).optional(),
  status: z.string().optional(),
});

export const createFieldSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  size: z.number().positive(),
});

export const updateFieldSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  size: z.number().positive().optional(),
});

