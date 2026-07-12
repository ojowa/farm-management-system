import { z } from 'zod';

const dateSchema = z.string().datetime().or(z.date()).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const createExpenseSchema = z.object({
  farmId: z.string().uuid(),
  title: z.string().min(2),
  amount: z.number().positive(),
  date: dateSchema,
});

export const updateExpenseSchema = z.object({
  farmId: z.string().uuid().optional(),
  title: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  date: dateSchema.optional(),
});

export const createSaleSchema = z.object({
  farmId: z.string().uuid(),
  item: z.string().min(2),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  date: dateSchema,
});

export const updateSaleSchema = z.object({
  farmId: z.string().uuid().optional(),
  item: z.string().min(2).optional(),
  quantity: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
  date: dateSchema.optional(),
});

export const createBudgetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  farmId: z.string().uuid().optional(),
  startDate: dateSchema,
  endDate: dateSchema,
});

export const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  farmId: z.string().uuid().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: z.enum(['ACTIVE', 'CLOSED', 'ARCHIVED']).optional(),
});

export const createBudgetCategorySchema = z.object({
  name: z.string().min(1),
  budgetAmount: z.number().positive(),
});

export const updateBudgetCategorySchema = z.object({
  name: z.string().min(1).optional(),
  budgetAmount: z.number().positive().optional(),
});

