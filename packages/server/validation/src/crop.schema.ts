import { z } from 'zod';

export const createCropSchema = z.object({
  name: z.string().min(2),
});

export const updateCropSchema = z.object({
  name: z.string().min(2).optional(),
});

export const createCropCycleSchema = z.object({
  fieldId: z.string().uuid(),
  cropId: z.string().uuid(),
  plantingDate: z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  harvestDate: z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  health: z.number().min(0).max(100).optional().default(100),
  status: z.string().optional().default('growing'),
});

export const updateCropCycleSchema = z.object({
  fieldId: z.string().uuid().optional(),
  cropId: z.string().uuid().optional(),
  plantingDate: z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  harvestDate: z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  health: z.number().min(0).max(100).optional(),
  status: z.string().optional(),
});
