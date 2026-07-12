import { z } from 'zod';

export const createWorkerSchema = z.object({
  farmId: z.string().uuid(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().min(1),
  department: z.string().optional(),
  hireDate: z.string().optional(),
});

export const updateWorkerSchema = z.object({
  farmId: z.string().uuid().optional(),
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().min(1).optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  status: z.string().optional(),
});

