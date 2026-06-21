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
