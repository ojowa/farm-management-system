import { z } from 'zod';

export const createWorkerSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  role: z.string().min(2),
});

export const updateWorkerSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  role: z.string().min(2).optional(),
});

