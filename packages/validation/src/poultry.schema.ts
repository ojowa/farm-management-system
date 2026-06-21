import { z } from 'zod';

const dateSchema = z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const createPoultryHouseSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  capacity: z.number().int().positive(),
});

export const updatePoultryHouseSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  capacity: z.number().int().positive().optional(),
});

export const createPenSchema = z.object({
  poultryHouseId: z.string().uuid(),
  name: z.string().min(1),
  capacity: z.number().int().positive(),
});

export const updatePenSchema = z.object({
  poultryHouseId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
});

export const createBreedSchema = z.object({
  name: z.string().min(2),
  birdType: z.string().min(2),
});

export const updateBreedSchema = z.object({
  name: z.string().min(2).optional(),
  birdType: z.string().min(2).optional(),
});

export const createFlockSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  penId: z.string().uuid(),
  breedId: z.string().uuid(),
  batchCode: z.string().min(2),
  birdCount: z.number().int().nonnegative(),
  currentCount: z.number().int().nonnegative(),
  arrivalDate: dateSchema,
  currentAgeDays: z.number().int().nonnegative(),
  status: z.string().min(2),
});

export const updateFlockSchema = z.object({
  organizationId: z.string().uuid().optional(),
  farmId: z.string().uuid().optional(),
  penId: z.string().uuid().optional(),
  breedId: z.string().uuid().optional(),
  batchCode: z.string().min(2).optional(),
  birdCount: z.number().int().nonnegative().optional(),
  currentCount: z.number().int().nonnegative().optional(),
  arrivalDate: dateSchema.optional(),
  currentAgeDays: z.number().int().nonnegative().optional(),
  status: z.string().min(2).optional(),
});

export const createFeedingRecordSchema = z.object({
  flockId: z.string().uuid(),
  feedType: z.string().min(2),
  quantityKg: z.number().positive(),
  date: dateSchema,
});

export const updateFeedingRecordSchema = z.object({
  flockId: z.string().uuid().optional(),
  feedType: z.string().min(2).optional(),
  quantityKg: z.number().positive().optional(),
  date: dateSchema.optional(),
});

export const createVaccinationRecordSchema = z.object({
  flockId: z.string().uuid(),
  vaccine: z.string().min(2),
  dosage: z.string().optional().nullable(),
  date: dateSchema,
});

export const updateVaccinationRecordSchema = z.object({
  flockId: z.string().uuid().optional(),
  vaccine: z.string().min(2).optional(),
  dosage: z.string().optional().nullable(),
  date: dateSchema.optional(),
});

export const createMortalityRecordSchema = z.object({
  flockId: z.string().uuid(),
  count: z.number().int().positive(),
  cause: z.string().optional().nullable(),
  date: dateSchema,
});

export const updateMortalityRecordSchema = z.object({
  flockId: z.string().uuid().optional(),
  count: z.number().int().positive().optional(),
  cause: z.string().optional().nullable(),
  date: dateSchema.optional(),
});

// For compatibility with previous schema
export const poultryBatchSchema = z.object({
  farmId: z.string().uuid(),
  type: z.enum(['BROILER', 'LAYER']),
  quantity: z.number().positive(),
  arrivalDate: z.date().or(z.string().datetime()),
});
