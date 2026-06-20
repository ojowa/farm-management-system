import { z } from 'zod';

export const createFarmSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  size: z.number().positive(),
  sizeUnit: z.enum(['ACRE', 'HECTARE']),
  type: z.enum(['CROP', 'LIVESTOCK', 'POULTRY', 'MIXED']),
});
