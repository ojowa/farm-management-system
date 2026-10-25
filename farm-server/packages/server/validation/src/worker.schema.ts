import { z } from 'zod';

/**
 * Kept in sync with HrApplicationService.createWorker/updateWorker. The
 * service's hard requirements (a real login email, a known farm) are mirrored
 * here so bad bodies fail with a 400 before any DB work starts; everything
 * else is optional and unknown keys are stripped by the pipe.
 */
export const createWorkerSchema = z.object({
  farmId: z.string().min(1, 'farmId is required'),
  userId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, 'Last name is required'),
  email: z
    .string({ required_error: 'Email is required — it is the worker login' })
    .min(1, 'Email is required — it is the worker login')
    .email('Enter a valid email address'),
  phone: z.string().optional().nullable(),
  position: z.string().min(1, 'Position is required'),
  // Either half is enough: departmentId wins, a bare name is resolved (and
  // created if new) by the service so legacy free-text clients keep working.
  department: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  roleId: z.string().optional(),

  // Employment / payroll
  payRate: z.number().min(0).optional().nullable(),
  payType: z.string().optional().nullable(),
  terminationDate: z.string().optional().nullable(),
  skills: z.array(z.string().min(1)).optional(),

  // Emergency contact
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
});

export const updateWorkerSchema = z
  .object({
    farmId: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    middleName: z.string().optional().nullable(),
    lastName: z.string().min(1).optional(),
    email: z.string().email('Enter a valid email address').optional(),
    phone: z.string().optional().nullable(),
    position: z.string().min(1).optional(),
    department: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    status: z
      .string()
      .transform((s) => s.toUpperCase())
      .pipe(z.enum(['ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED']))
      .optional(),

    payRate: z.number().min(0).optional().nullable(),
    payType: z.string().optional().nullable(),
    terminationDate: z.string().optional().nullable(),
    skills: z.array(z.string().min(1)).optional(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z.string().optional().nullable(),
    emergencyContactRelation: z.string().optional().nullable(),
  })
  .partial();
