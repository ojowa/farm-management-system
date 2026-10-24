import { z } from 'zod';

const dateSchema = z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const createPoultryHouseSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  capacity: z.number().int().min(0),
});

export const updatePoultryHouseSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  capacity: z.number().int().positive().optional(),
});

export const createPenSchema = z.object({
  poultryHouseId: z.string().uuid(),
  name: z.string().min(1),
  capacity: z.number().int().min(0),
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
  // organizationId is intentionally NOT accepted from the client — the server
  // stamps it from the verified JWT (the old required field was spoofable).
  farmId: z.string().uuid(),
  penId: z.string().uuid(),
  breedId: z.string().uuid(),
  batchCode: z.string().min(2),
  birdCount: z.number().int().nonnegative(),
  currentCount: z.number().int().nonnegative(),
  arrivalDate: dateSchema,
  currentAgeDays: z.number().int().nonnegative(),
  // P7: status was a free string — 'acive' or 'Active' produced a badge the
  // clients could never match. Constrained to the values they render
  // (mobile's edit form also offers COMPLETED).
  status: z.enum(['ACTIVE', 'SOLD', 'DECEASED', 'COMPLETED']),
});

export const updateFlockSchema = z.object({
  // organizationId is intentionally NOT accepted — a flock can never change
  // tenancy; the service strips it regardless.
  farmId: z.string().uuid().optional(),
  penId: z.string().uuid().optional(),
  breedId: z.string().uuid().optional(),
  batchCode: z.string().min(2).optional(),
  birdCount: z.number().int().nonnegative().optional(),
  currentCount: z.number().int().nonnegative().optional(),
  arrivalDate: dateSchema.optional(),
  currentAgeDays: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'SOLD', 'DECEASED', 'COMPLETED']).optional(),
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

// Medication schemas

export const createMedicationSchema = z.object({
  flockId: z.string().uuid(),
  name: z.string().min(2),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  startDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateMedicationSchema = z.object({
  flockId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  dosage: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

// Egg production schemas (P4)
//
// These two endpoints were the only poultry writes without a Zod pipe: the
// body went straight into Prisma, so a missing flockId or a string egg count
// surfaced as a 500. Shapes mirror what the mobile record screen and the
// admin forms actually send.

export const createEggProductionSchema = z
  .object({
    flockId: z.string().uuid(),
    date: dateSchema,
    totalEggs: z.number().int().nonnegative(),
    goodEggs: z.number().int().nonnegative().default(0),
    brokenEggs: z.number().int().nonnegative().default(0),
    notes: z.string().max(2000).nullish(),
  })
  // The screen validates this client-side too; enforce it server-side so the
  // totals can never contradict their parts.
  .refine((data) => data.goodEggs + data.brokenEggs <= data.totalEggs, {
    message: 'goodEggs + brokenEggs cannot exceed totalEggs',
    path: ['goodEggs'],
  });

export const updateEggProductionSchema = z
  .object({
    flockId: z.string().uuid().optional(),
    date: dateSchema.optional(),
    totalEggs: z.number().int().nonnegative().optional(),
    goodEggs: z.number().int().nonnegative().optional(),
    brokenEggs: z.number().int().nonnegative().optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine(
    (data) =>
      data.goodEggs === undefined ||
      data.brokenEggs === undefined ||
      data.totalEggs === undefined ||
      data.goodEggs + data.brokenEggs <= data.totalEggs,
    {
      message: 'goodEggs + brokenEggs cannot exceed totalEggs',
      path: ['goodEggs'],
    },
  );

// Poultry sale schemas (P4 + P2)
//
// quantity is positive-int (a negative "sale" used to ADD birds to the
// flock's count), and flockId may be null for a generic sale — but when
// present the service checks it belongs to the caller's organization.

export const createPoultrySaleSchema = z.object({
  flockId: z.string().uuid().nullish(),
  farmId: z.string().uuid().nullish(),
  date: dateSchema,
  buyerName: z.string().max(300).nullish(),
  birdType: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  weight: z.number().positive().nullish(),
  pricePerBird: z.number().nonnegative().nullish(),
  totalAmount: z.number().nonnegative(),
  paymentMethod: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const updatePoultrySaleSchema = z.object({
  flockId: z.string().uuid().nullish(),
  farmId: z.string().uuid().nullish(),
  date: dateSchema.optional(),
  buyerName: z.string().max(300).nullish(),
  birdType: z.string().min(1).max(100).optional(),
  quantity: z.number().int().positive().optional(),
  weight: z.number().positive().nullish(),
  pricePerBird: z.number().nonnegative().nullish(),
  totalAmount: z.number().nonnegative().optional(),
  paymentMethod: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
});
