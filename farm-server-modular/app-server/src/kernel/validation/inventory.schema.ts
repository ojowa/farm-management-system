import { z } from 'zod';

export const createInventoryItemSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2),
  category: z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'EQUIPMENT', 'OTHER']),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
});

export const updateInventoryItemSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  category: z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'EQUIPMENT', 'OTHER']).optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().min(1).optional(),
});

// Backwards-compatible alias retained for existing call sites
export const inventoryItemSchema = createInventoryItemSchema;

