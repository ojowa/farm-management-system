import { z } from 'zod';

export const createCropSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  variety: z.string().optional(),
  plantingDate: z.date().or(z.string().datetime()),
});
