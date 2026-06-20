import { z } from 'zod';

export const createWorkerSchema = z.object({
  farmId: z.string().uuid(),
  fullName: z.string().min(2),
  position: z.string().min(2),
});
