import { z } from 'zod';

export const inventoryItemSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  category: z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'EQUIPMENT', 'OTHER']),
  quantity: z.number().nonnegative(),
  unit: z.string(),
});
