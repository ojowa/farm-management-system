import { z } from 'zod';

/**
 * Body schemas for the Department entity. Departments are org-level and
 * unique by name within the organization (the service enforces that, so the
 * schema only guarantees a non-empty name); deletes are blocked while
 * workers/tasks/shifts still reference the row.
 */
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
