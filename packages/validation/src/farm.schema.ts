import { z } from 'zod';

export const createFarmSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2),
  location: z.string().min(2).nullable().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const updateFarmSchema = z.object({
  organizationId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  location: z.string().min(2).nullable().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
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

