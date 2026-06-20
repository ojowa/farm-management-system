import { z } from 'zod';

export const poultryBatchSchema = z.object({
  farmId: z.string().uuid(),
  type: z.enum(['BROILER', 'LAYER']),
  quantity: z.number().positive(),
  arrivalDate: z.date().or(z.string().datetime()),
});
