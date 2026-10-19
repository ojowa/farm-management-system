import { z } from 'zod';

/**
 * Body schemas for the HR module — the only module that previously accepted
 * `@Body() body: any` with no validation at all. Required fields mirror the
 * BadRequestException checks in HrApplicationService so the two layers agree;
 * optional fields match what the service actually reads.
 */

// Closed value sets, one per Prisma enum introduced in
// 20261019130000_hr_enums_datetime_task_worker_extensions.
const taskStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const taskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE']);

/** Any string Date.parse can read: "2026-10-19", ISO timestamps, ... */
const dateString = z
  .string({ required_error: 'Date is required' })
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' });

/** Clock times arrive as "HH:MM" from <input type="time">; the service also
 *  tolerates full ISO timestamps, so only reject things it cannot parse. */
const clockTime = z.string().min(1, 'Time must be HH:MM');

const timeOfDay = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM');

// ── Tasks ────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  priority: taskPriority.default('MEDIUM'),
  status: taskStatus.default('PENDING'),
  assignedToId: z.string().optional().nullable(),
  assignedToName: z.string().optional().nullable(),
  farmId: z.string().optional().nullable(),
  dueDate: dateString.optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: taskPriority.optional(),
  status: taskStatus.optional(),
  assignedToId: z.string().optional().nullable(),
  assignedToName: z.string().optional().nullable(),
  farmId: z.string().optional().nullable(),
  dueDate: dateString.optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
});

export const createTaskCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

export const createTaskAttachmentSchema = z.object({
  fileName: z.string().min(1, 'fileName is required'),
  fileUrl: z.string().min(1, 'fileUrl is required'),
  fileSize: z.number().int().min(0).optional(),
});

// ── Attendance ───────────────────────────────────────────────────────────

export const createAttendanceSchema = z.object({
  workerId: z.string().min(1, 'workerId is required'),
  workerName: z.string().min(1, 'workerName is required'),
  date: dateString,
  status: attendanceStatus,
  clockIn: clockTime.optional().nullable(),
  clockOut: clockTime.optional().nullable(),
  hoursWorked: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatus.optional(),
  clockIn: clockTime.optional().nullable(),
  clockOut: clockTime.optional().nullable(),
  hoursWorked: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ── Shifts & roster ──────────────────────────────────────────────────────

export const createShiftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: timeOfDay,
  endTime: timeOfDay,
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // `days` is the legacy/mobile alias for daysOfWeek.
  daysOfWeek: z.array(z.string().max(3)).optional(),
  days: z.array(z.string().max(3)).optional(),
});

export const updateShiftSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: timeOfDay.optional(),
  endTime: timeOfDay.optional(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  daysOfWeek: z.array(z.string().max(3)).optional(),
  days: z.array(z.string().max(3)).optional(),
});

export const createShiftAssignmentSchema = z.object({
  shiftId: z.string().min(1, 'shiftId is required'),
  userId: z.string().min(1, 'userId is required'),
  date: dateString,
  notes: z.string().optional().nullable(),
});

export const updateShiftAssignmentSchema = z.object({
  shiftId: z.string().min(1).optional(),
  date: dateString.optional(),
  notes: z.string().optional().nullable(),
});

// ── Leave ────────────────────────────────────────────────────────────────

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  daysPerYear: z.number().int().min(0).optional(),
  isPaid: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().min(1).optional(),
  daysPerYear: z.number().int().min(0).optional(),
  isPaid: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'leaveTypeId is required'),
  startDate: dateString,
  endDate: dateString,
  reason: z.string().optional().nullable(),
  // Callers may attribute the request to someone else's profile.
  userId: z.string().optional(),
  workerId: z.string().optional(),
});

export const updateLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1).optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  reason: z.string().optional().nullable(),
});

/** Coerced: clients have been known to send year/totalDays as strings. */
export const upsertLeaveBalanceSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  leaveTypeId: z.string().min(1, 'leaveTypeId is required'),
  year: z.coerce.number().int().min(1970).max(2200),
  totalDays: z.coerce.number().int().min(0),
  usedDays: z.coerce.number().int().min(0).optional(),
});
