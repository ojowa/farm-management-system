import { z } from 'zod';

const dateSchema = z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const createPondSchema = z.object({
  // organizationId is intentionally NOT accepted from the client — the server
  // stamps it from the verified JWT.
  farmId: z.string().uuid(),
  name: z.string().min(2),
  pondType: z.string().min(2).optional(),
  area: z.number().nonnegative().optional().nullable(),
  waterSource: z.string().min(1).optional().nullable(),
  capacity: z.number().int().nonnegative().optional().nullable(),
  status: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
});

export const updatePondSchema = z.object({
  // organizationId is intentionally NOT accepted — a pond can never change
  // tenancy; the service strips it regardless.
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  pondType: z.string().min(2).optional(),
  area: z.number().nonnegative().optional().nullable(),
  waterSource: z.string().min(1).optional().nullable(),
  capacity: z.number().int().nonnegative().optional().nullable(),
  status: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
});

export const createStockingSchema = z.object({
  species: z.string().min(2),
  strain: z.string().min(1).optional().nullable(),
  count: z.number().int().positive(),
  source: z.string().min(1).optional().nullable(),
  totalCost: z.number().nonnegative().optional().nullable(),
  stockedAt: dateSchema,
  expectedHarvestAt: dateSchema.optional().nullable(),
  status: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
});

export const updateStockingSchema = z.object({
  species: z.string().min(2).optional(),
  strain: z.string().min(1).optional().nullable(),
  count: z.number().int().positive().optional(),
  source: z.string().min(1).optional().nullable(),
  totalCost: z.number().nonnegative().optional().nullable(),
  stockedAt: dateSchema.optional(),
  expectedHarvestAt: dateSchema.optional().nullable(),
  status: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
});

export const createFeedingSchema = z.object({
  feedType: z.string().min(2),
  quantityKg: z.number().positive(),
  cost: z.number().nonnegative().optional().nullable(),
  fedAt: dateSchema,
  notes: z.string().optional().nullable(),
  stockingId: z.string().uuid().optional().nullable(),
});

export const createWaterQualitySchema = z.object({
  ph: z.number().min(0).max(14).optional().nullable(),
  temperatureC: z.number().optional().nullable(),
  dissolvedOxygen: z.number().nonnegative().optional().nullable(),
  ammonia: z.number().nonnegative().optional().nullable(),
  turbidity: z.number().nonnegative().optional().nullable(),
  recordedAt: dateSchema,
  notes: z.string().optional().nullable(),
});

export const createHarvestSchema = z.object({
  quantityKg: z.number().positive(),
  count: z.number().int().positive().optional().nullable(),
  unitPrice: z.number().nonnegative().optional().nullable(),
  revenue: z.number().nonnegative().optional().nullable(),
  harvestedAt: dateSchema,
  notes: z.string().optional().nullable(),
  stockingId: z.string().uuid().optional().nullable(),
});
