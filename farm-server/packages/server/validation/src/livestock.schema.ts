import { z } from 'zod';

const dateSchema = z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
const genderSchema = z.enum(['MALE', 'FEMALE']);
const statusSchema = z.enum(['HEALTHY', 'SICK', 'SOLD', 'DECEASED']);

export const createLivestockSchema = z.object({
  farmId: z.string().uuid(),
  species: z.string().min(2),
  breed: z.string().min(1).nullable().optional(),
  gender: genderSchema,
  birthDate: dateSchema,
  status: statusSchema,
});

export const updateLivestockSchema = z.object({
  farmId: z.string().uuid().optional(),
  species: z.string().min(2).optional(),
  breed: z.string().min(1).nullable().optional(),
  gender: genderSchema.optional(),
  birthDate: dateSchema.optional(),
  status: statusSchema.optional(),
});

// ── Health records (L5) ──────────────────────────────────────────────────
// These bodies used to be `@Body() body: any` with zero validation: a missing
// `type`/`date` reached Prisma as undefined (500) and `cost: "abc"` became a
// raw cast. Now validated at the edge like the livestock routes.

export const createHealthRecordSchema = z.object({
  type: z.enum(['VACCINATION', 'TREATMENT', 'CHECKUP', 'SURGERY', 'DEWORMING', 'OTHER']),
  date: dateSchema,
  description: z.string().min(1).max(2000),
  veterinarian: z.string().max(300).nullish(),
  medications: z.string().max(2000).nullish(),
  cost: z.number().min(0).nullish(),
  nextCheckupDate: dateSchema.nullish(),
});

export const updateHealthRecordSchema = z.object({
  type: z.enum(['VACCINATION', 'TREATMENT', 'CHECKUP', 'SURGERY', 'DEWORMING', 'OTHER']).optional(),
  date: dateSchema.optional(),
  description: z.string().min(1).max(2000).optional(),
  veterinarian: z.string().max(300).nullish(),
  medications: z.string().max(2000).nullish(),
  cost: z.number().min(0).nullish(),
  nextCheckupDate: dateSchema.nullish(),
});

// ── Vaccination schedules (L5) ──────────────────────────────────────────

export const createVaccinationScheduleSchema = z.object({
  vaccineName: z.string().min(1).max(300),
  scheduledDate: dateSchema,
  notes: z.string().max(2000).nullish(),
});

// ── Breeding records (L5) ───────────────────────────────────────────────

export const createBreedingRecordSchema = z.object({
  sireId: z.string().uuid(),
  damId: z.string().uuid(),
  sireName: z.string().max(300).nullish(),
  damName: z.string().max(300).nullish(),
  breedingDate: dateSchema,
  expectedDueDate: dateSchema.nullish(),
  notes: z.string().max(2000).nullish(),
});

export const updateBreedingRecordSchema = z.object({
  // Every value either client writes: admin offers PLANNED/BRED/CONFIRMED/
  // BORN/FAILED, mobile sends COMPLETED on birth, and PREGNANT sits in
  // between — an enum here used to reject half of them.
  status: z.enum(['PLANNED', 'BRED', 'CONFIRMED', 'PREGNANT', 'BORN', 'COMPLETED', 'FAILED']).optional(),
  actualBirthDate: dateSchema.nullish(),
  offspringCount: z.number().int().min(0).optional(),
  notes: z.string().max(2000).nullish(),
});

// ── Weight records (L5) ─────────────────────────────────────────────────

export const createWeightRecordSchema = z.object({
  weight: z.number().positive(),
  unit: z.string().min(1).max(20).optional(),
  recordedDate: dateSchema,
  notes: z.string().max(2000).nullish(),
});
