import { Inject, Injectable, Logger, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { EmailService } from '../../../notification/modules/email/email.service';
import { NotificationApplicationService } from '../../../notification/application/services/notification.service';
import { CreateNotificationRequest } from '../../../notification/presentation/dto/notification.dto';
import {
  WorkerRepository,
  AttendanceRepository,
  TaskRepository,
  ShiftRepository,
  ShiftAssignmentRepository,
  LeaveTypeRepository,
  LeaveRequestRepository,
  LeaveBalanceRepository,
  MessageRepository,
  MessageRecipientRepository,
  CorrespondenceRepository,
  CorrespondenceAttachmentRepository,
} from '../../domain/repositories/hr.repository';
import { Worker, Task, Shift } from '../../domain/entities/hr.entity';
import { HrEventService } from '../../infrastructure/messaging/hr.event.service';

/** Cryptographically-strong temporary password (~62 bits, 12 chars). */
function generateTempPassword(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

@Injectable()
export class HrApplicationService {
  private readonly logger = new Logger(HrApplicationService.name);

  constructor(@Inject('WorkerRepository') private readonly workerRepo: WorkerRepository, @Inject('AttendanceRepository') private readonly attendanceRepo: AttendanceRepository, @Inject('TaskRepository') private readonly taskRepo: TaskRepository, @Inject('ShiftRepository') private readonly shiftRepo: ShiftRepository, @Inject('ShiftAssignmentRepository') private readonly shiftAssignmentRepo: ShiftAssignmentRepository, @Inject('LeaveTypeRepository') private readonly leaveTypeRepo: LeaveTypeRepository, @Inject('LeaveRequestRepository') private readonly leaveRequestRepo: LeaveRequestRepository, @Inject('LeaveBalanceRepository') private readonly leaveBalanceRepo: LeaveBalanceRepository, @Inject('MessageRepository') private readonly messageRepo: MessageRepository, @Inject('MessageRecipientRepository') private readonly messageRecipientRepo: MessageRecipientRepository, @Inject('CorrespondenceRepository') private readonly correspondenceRepo: CorrespondenceRepository, @Inject('CorrespondenceAttachmentRepository') private readonly correspondenceAttachmentRepo: CorrespondenceAttachmentRepository, 
    private readonly eventService: HrEventService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationApplicationService,
  ) {}

  /**
   * Notify users about an HR event (leave, messages, tasks).
   *
   * Fire-and-forget on purpose: the notification module writes the row, emits
   * the realtime event and fans out push/email, but none of that may fail the
   * HR operation that triggered it.
   */
  private notify(
    userIds: Array<string | null | undefined>,
    organizationId: string,
    notification: Omit<CreateNotificationRequest, 'userId'>
  ): void {
    const targets = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (!targets.length || !organizationId) return;

    void Promise.allSettled(
      targets.map((userId) =>
        this.notificationService.create({ ...notification, userId }, organizationId)
      )
    ).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Notification "${notification.title}" failed: ${(result.reason as Error)?.message}`
          );
        }
      }
    });
  }

  /** Users whose role carries `permission` inside `organizationId`. */
  private async userIdsForPermission(
    organizationId: string,
    permission: string,
    excludeUserId?: string
  ): Promise<string[]> {
    const roleRows = await prisma.rolePermission.findMany({
      where: { permission: { name: permission } },
      select: { roleId: true },
    });
    const roleIds = roleRows.map((r) => r.roleId);
    if (!roleIds.length) return [];

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        roleId: { in: roleIds },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private static formatDate(value: Date | string): string {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // ── Clock-time helpers ────────────────────────────────────────────────
  // Attendance.clockIn/clockOut are stored as timestamps so overnight shifts
  // work, but the wire format every client speaks (admin, mobile, console)
  // remains "HH:MM".

  /** "09:05" (or an ISO timestamp) anchored to the record's date → timestamp. */
  private static toClockTimestamp(date: Date | string, time?: string | null): Date | null {
    if (!time) return null;
    const raw = String(time).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
      const [hh, mm, ss] = raw.split(':').map((n) => parseInt(n, 10));
      if (hh > 23 || mm > 59) return null;
      const base = new Date(date);
      base.setHours(hh, mm, ss || 0, 0);
      return base;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Timestamp → "HH:MM" for API responses. */
  private static formatClock(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toTimeString().slice(0, 5);
  }

  /** A checkout earlier than the clock-in means the shift ran past midnight. */
  private static rollOvernight(clockIn: Date | null, clockOut: Date | null): Date | null {
    if (!clockIn || !clockOut || clockOut >= clockIn) return clockOut;
    return new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
  }

  private static roundHours(from: Date | null, to: Date | null): number | null {
    if (!from || !to) return null;
    const hours = (to.getTime() - from.getTime()) / 3_600_000;
    if (hours < 0 || hours > 24) return null;
    return Math.round(hours * 100) / 100;
  }

  private static serializeAttendance<T extends { clockIn?: unknown; clockOut?: unknown }>(record: T) {
    return {
      ...record,
      clockIn: HrApplicationService.formatClock(record.clockIn as Date | null),
      clockOut: HrApplicationService.formatClock(record.clockOut as Date | null),
    };
  }

  private static serializeAttendanceList<T extends { clockIn?: unknown; clockOut?: unknown }>(
    records: T[]
  ) {
    return records.map((r) => HrApplicationService.serializeAttendance(r));
  }

  /** Same shape as TaskRepository.getStatusStats, computed from an in-memory set. */
  private static countTaskStatus(tasks: { status: string }[]): { status: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const t of tasks) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  }

  /** Next due date for a recurring task (DAILY/WEEKLY/MONTHLY), or null. */
  private static advanceDue(date: Date | string, rule?: string | null): Date | null {
    if (!rule) return null;
    const next = new Date(date);
    if (Number.isNaN(next.getTime())) return null;
    switch (rule.toUpperCase()) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }
    return next;
  }

  // ── Roster overlap helpers ────────────────────────────────────────────

  private static timeToMinutes(value?: string | null): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
    if (!m) return null;
    const [hh, mm] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
  }

  /** ["mon", "Tuesday"] → ["MON", "TUE"]; empty array means "runs every day". */
  private static normalizeDays(days?: string[]): string[] {
    if (!Array.isArray(days)) return [];
    const valid = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return [
      ...new Set(
        days
          .map((d) => String(d).toUpperCase().slice(0, 3))
          .filter((d) => valid.includes(d))
      ),
    ];
  }

  /** Does `shift` run on `date` (per its daysOfWeek)? Empty list = yes. */
  private static runsOnDay(
    date: Date | string,
    shift: { daysOfWeek?: string[] | null }
  ): boolean {
    const days = shift.daysOfWeek ?? [];
    if (!days.length) return true;
    const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(date).getDay()];
    return days.includes(weekday);
  }

  /** Absolute [start, end] ms window of a shift on a date; end <= start wraps midnight. */
  private static shiftInterval(
    date: Date | string,
    shift: { startTime: string; endTime: string }
  ): [number, number] | null {
    const start = HrApplicationService.timeToMinutes(shift.startTime);
    const end = HrApplicationService.timeToMinutes(shift.endTime);
    if (start === null || end === null) return null;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const base = day.getTime();
    return [base + start * 60_000, base + (end <= start ? end + 1440 : end) * 60_000];
  }

  /** The caller's Worker row for self-service scoping (WORKER role). */
  private async selfWorker(organizationId: string, userId: string) {
    return prisma.worker.findFirst({
      where: { organizationId, userId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  // Worker operations
  async getWorkerById(id: string, organizationId: string) {
    const worker = await this.workerRepo.findById(id, organizationId);
    if (!worker) throw new NotFoundException(`Worker with ID ${id} not found`);
    return worker;
  }

  async getAllWorkers(
    organizationId: string,
    opts?: {
      search?: string;
      status?: string;
      farmId?: string;
      department?: string;
      position?: string;
      page?: number | string;
      limit?: number | string;
    }
  ) {
    const filters: { search?: string; status?: string; farmId?: string; department?: string; position?: string } = {};
    if (opts?.search) filters.search = String(opts.search).trim();
    if (opts?.farmId) filters.farmId = String(opts.farmId);
    if (opts?.department) filters.department = String(opts.department);
    if (opts?.position) filters.position = String(opts.position);
    if (opts?.status) {
      const status = String(opts.status).toUpperCase();
      if (!['ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED'].includes(status)) {
        throw new BadRequestException('Invalid status filter');
      }
      filters.status = status;
    }

    // Pagination is opt-in via `page` — clients that pass only `limit`
    // (invite dropdowns) and the mobile app still get a plain array.
    const page = Math.floor(Number(opts?.page));
    if (!opts?.page || !Number.isFinite(page) || page < 1) {
      return this.workerRepo.findByOrganizationId(organizationId, filters);
    }

    const limitRaw = Math.floor(Number(opts?.limit));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
    const { rows, total } = await this.workerRepo.findManyWithCount(
      organizationId,
      filters,
      page,
      limit
    );
    return { data: rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async createWorker(data: {
    organizationId: string;
    farmId: string;
    userId?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email?: string;
    phone?: string;
    position: string;
    department?: string;
    hireDate?: Date;
    roleId?: string;
    payRate?: number;
    payType?: string;
    terminationDate?: Date;
    skills?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
  }) {
    const organizationId = data.organizationId;
    const email = data.email?.trim() || '';
    if (!email) throw new BadRequestException('Email is required — it is the worker login');

    // Login role: an explicit pick must be org-applicable (own custom role or
    // a non-platform system role) — the same rules org-admin uses, so a
    // platform role can never be assigned here. Without one we default to the
    // system WORKER role, which every seeded organization already has.
    let roleId = data.roleId;
    if (roleId) {
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          OR: [{ organizationId }, { organizationId: null, isPlatformAdmin: false }],
        },
      });
      if (!role) throw new BadRequestException('Unknown role');
    } else {
      const fallback = await prisma.role.findFirst({
        where: { name: 'WORKER', organizationId: null, isPlatformAdmin: false },
      });
      if (!fallback) throw new BadRequestException('Unknown role');
      roleId = fallback.id;
    }

    // Login account: link an existing user of this organization, otherwise
    // create one with a temporary password — the pattern every invite uses
    // (org-admin/platform users). An email registered to another organization
    // must never be claimed here.
    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    let tempPassword: string | null = null;
    if (existing) {
      if (existing.organizationId !== organizationId) throw new ConflictException('Email already registered');
      userId = existing.id;
    } else {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const user = await prisma.user.create({
        data: {
          email,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          passwordHash,
          roleId,
          organizationId,
        },
      });
      userId = user.id;
    }

    // The Worker row mirrors the profile and points at the account; roleId
    // and userId from the raw body never reach it directly.
    const worker = await this.workerRepo.create({
      organizationId,
      farmId: data.farmId,
      userId,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      email,
      phone: data.phone || null,
      position: data.position,
      department: data.department || null,
      hireDate: data.hireDate,
      status: 'ACTIVE',
      payRate: data.payRate ?? null,
      payType: data.payType || null,
      terminationDate: data.terminationDate ?? null,
      skills: data.skills ?? [],
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
    });

    // Invitation email — logged when unconfigured; delivery failure never
    // fails the worker creation (the caller still gets the temp password).
    if (tempPassword) {
      try {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        await this.emailService.sendInvitationEmail(email, data.firstName, tempPassword, org?.name || 'your organization');
      } catch {
        /* email delivery must not block creating the worker */
      }
    }

    await this.eventService.emitHrEvent('created', { entity: 'worker', data: worker });
    return { ...worker, tempPassword };
  }

  async updateWorker(id: string, organizationId: string, data: Partial<{
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    status: string;
    farmId: string;
    hireDate: string;
    payRate: number;
    payType: string;
    terminationDate: string;
    skills: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }>) {
    const worker = await this.getWorkerById(id, organizationId);
    // Login is by the linked account's email: keep the account in step with
    // the worker profile, failing loudly on a duplicate before touching rows.
    if (worker.userId && (data.email !== undefined || data.firstName !== undefined || data.lastName !== undefined)) {
      if (data.email !== undefined) {
        const email = data.email.trim();
        if (!email) throw new BadRequestException('Email is required — it is the worker login');
        const clash = await prisma.user.findUnique({ where: { email } });
        if (clash && clash.id !== worker.userId) throw new ConflictException('Email already registered');
      }
      await prisma.user.update({
        where: { id: worker.userId },
        data: {
          ...(data.email !== undefined ? { email: data.email.trim() } : {}),
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        },
      });
    }

    // Whitelist: the raw body flows to Prisma, so unknown keys (roleId and
    // friends) must never reach it — they used to surface as a 500.
    const allowed: Record<string, unknown> = {};
    const pick = (key: keyof typeof data) => {
      if (data[key] !== undefined) allowed[key] = data[key];
    };
    (
      [
        'firstName',
        'middleName',
        'lastName',
        'email',
        'phone',
        'position',
        'department',
        'status',
        'payRate',
        'payType',
        'skills',
        'emergencyContactName',
        'emergencyContactPhone',
        'emergencyContactRelation',
      ] as const
    ).forEach(pick);
    if (data.farmId !== undefined) allowed.farmId = data.farmId;
    if (data.hireDate !== undefined) allowed.hireDate = data.hireDate ? new Date(data.hireDate) : null;
    if (data.terminationDate !== undefined) {
      allowed.terminationDate = data.terminationDate ? new Date(data.terminationDate) : null;
    }
    if (data.email !== undefined) allowed.email = data.email.trim();

    const updated = await this.workerRepo.update(id, allowed as Partial<Worker>);
    await this.eventService.emitHrEvent('updated', { entity: 'worker', data: updated });
    return updated;
  }

  /**
   * Re-invite a worker: rotate their login password to a fresh temporary one,
   * reactivate the account, and resend the invitation email. The temp password
   * is returned so an admin can hand it over directly when email is down.
   */
  async reinviteWorker(id: string, organizationId: string) {
    const worker = await this.getWorkerById(id, organizationId);
    if (!worker.userId) {
      throw new BadRequestException('This worker has no linked login account');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({
      where: { id: worker.userId },
      data: { passwordHash, isActive: true },
    });

    if (worker.email) {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        });
        await this.emailService.sendInvitationEmail(
          worker.email,
          worker.firstName,
          tempPassword,
          org?.name || 'your organization'
        );
      } catch {
        /* delivery failure must not fail the reinvite — admin has the password */
      }
    }

    return { email: worker.email, tempPassword };
  }

  async deleteWorker(id: string, organizationId: string) {
    const worker = await this.getWorkerById(id, organizationId);
    await this.eventService.emitHrEvent('deleted', {
      entity: 'worker',
      id,
      organizationId,
      data: { id, organizationId },
    });
    await this.workerRepo.delete(id);

    // W2: the worker's login must not outlive the worker profile. Deactivate
    // the linked account only when no other non-deleted worker still uses it
    // (workers can share a user record by email link).
    if (worker.userId) {
      try {
        const others = await prisma.worker.count({
          where: { userId: worker.userId, id: { not: id }, deletedAt: null },
        });
        if (others === 0) {
          await prisma.user.update({
            where: { id: worker.userId },
            data: { isActive: false },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to deactivate login ${worker.userId} after deleting worker ${id}: ${err}`);
      }
    }
    return { id, deleted: true };
  }

  // Attendance operations
  async getAttendance(
    organizationId: string,
    filters?: {
      workerId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    caller?: { userId: string; permissions: string[] }
  ) {
    const processedFilters: any = {};
    if (filters?.workerId) processedFilters.workerId = filters.workerId;
    if (filters?.status) processedFilters.status = filters.status;
    if (filters?.date) {
      const d = new Date(filters.date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      processedFilters.date = start;
      processedFilters.startDate = start;
      processedFilters.endDate = end;
    } else if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) processedFilters.startDate = new Date(filters.startDate);
      if (filters.endDate) processedFilters.endDate = new Date(filters.endDate);
    }

    // Self-service (worker.* without hr.read): only ever your own records.
    if (caller && !caller.permissions.includes('hr.read')) {
      const self = await this.selfWorker(organizationId, caller.userId);
      processedFilters.workerId = self?.id ?? '__no_worker_profile__';
    }

    const records = await this.attendanceRepo.findByOrganizationId(organizationId, processedFilters);
    return HrApplicationService.serializeAttendanceList(records);
  }

  async getTodayAttendance(
    organizationId: string,
    caller?: { userId: string; permissions: string[] }
  ) {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const filters: { startDate: Date; endDate: Date; workerId?: string } = {
      startDate: start,
      endDate: end,
    };
    if (caller && !caller.permissions.includes('hr.read')) {
      const self = await this.selfWorker(organizationId, caller.userId);
      filters.workerId = self?.id ?? '__no_worker_profile__';
    }

    const records = await this.attendanceRepo.findByOrganizationId(organizationId, filters);

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r) => r.status === 'ON_LEAVE').length,
    };

    return { records: HrApplicationService.serializeAttendanceList(records), summary };
  }

  /**
   * Monthly summary for one worker — or for the whole organization when
   * `workerId` is omitted (the org-wide roster view admins need).
   */
  async getAttendanceSummary(
    organizationId: string,
    workerId: string | undefined,
    month?: number,
    year?: number,
    caller?: { userId: string; permissions: string[] }
  ) {
    let targetWorkerId = workerId;
    if (caller && !caller.permissions.includes('hr.read')) {
      const self = await this.selfWorker(organizationId, caller.userId);
      targetWorkerId = self?.id;
      if (!targetWorkerId) throw new ForbiddenException('No worker profile is linked to your account');
    }

    const m = month ?? new Date().getMonth();
    const y = year ?? new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await this.attendanceRepo.findByOrganizationId(organizationId, {
      ...(targetWorkerId ? { workerId: targetWorkerId } : {}),
      startDate: start,
      endDate: end,
    });

    const summaryData = {
      totalDays: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r) => r.status === 'ON_LEAVE').length,
      totalHours: records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0),
      attendanceRate: records.length > 0
        ? Math.round(((records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length) / records.length) * 100)
        : 0,
    };

    return { records: HrApplicationService.serializeAttendanceList(records), summary: summaryData };
  }

  async createAttendance(organizationId: string, data: {
    workerId: string;
    workerName: string;
    date: string;
    status: string;
    clockIn?: string;
    clockOut?: string;
    hoursWorked?: number;
    notes?: string;
  }) {
    const { workerId, workerName, date, status, clockIn, clockOut, hoursWorked, notes } = data;
    if (!workerId || !workerName || !date || !status) {
      throw new BadRequestException('workerId, workerName, date, and status are required');
    }

    const day = new Date(date);
    const inTs = HrApplicationService.toClockTimestamp(day, clockIn);
    const outTs = HrApplicationService.rollOvernight(inTs, HrApplicationService.toClockTimestamp(day, clockOut));

    const attendance = await this.attendanceRepo.create({
      organizationId,
      workerId,
      workerName,
      date: day,
      status,
      clockIn: inTs,
      clockOut: outTs,
      hoursWorked: hoursWorked ?? HrApplicationService.roundHours(inTs, outTs),
      notes: notes?.trim() || null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'attendance', data: attendance });
    return HrApplicationService.serializeAttendance(attendance);
  }

  /**
   * Self-service scoping: a caller with worker.write but no hr.write can only
   * ever clock their own profile in/out — the body's workerId is ignored.
   */
  private async selfClockWorkerId(
    organizationId: string,
    workerId: string,
    caller?: { userId: string; permissions: string[] }
  ): Promise<{ workerId: string; workerName: string }> {
    if (!caller || caller.permissions.includes('hr.write')) {
      return { workerId, workerName: '' };
    }
    const self = await this.selfWorker(organizationId, caller.userId);
    if (!self) throw new ForbiddenException('No worker profile is linked to your account');
    return {
      workerId: self.id,
      workerName: [self.firstName, self.lastName].filter(Boolean).join(' '),
    };
  }

  async clockIn(
    organizationId: string,
    workerId: string,
    workerName: string,
    caller?: { userId: string; permissions: string[] }
  ) {
    if (!workerId || !workerName) {
      throw new BadRequestException('workerId and workerName are required');
    }
    const scoped = await this.selfClockWorkerId(organizationId, workerId, caller);
    workerId = scoped.workerId;
    if (scoped.workerName) workerName = scoped.workerName;

    const today = new Date();
    const existing = await this.attendanceRepo.findByWorkerAndDate(organizationId, workerId, today);
    if (existing) throw new ConflictException('Worker already clocked in today');

    const clockInTime = today.toTimeString().slice(0, 5);
    const isLate = clockInTime > '09:00';

    const attendance = await this.attendanceRepo.create({
      organizationId,
      workerId,
      workerName,
      date: today,
      status: isLate ? 'LATE' : 'PRESENT',
      clockIn: today,
      clockOut: null,
      hoursWorked: null,
      notes: null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'attendance', data: attendance });
    return HrApplicationService.serializeAttendance(attendance);
  }

  async clockOut(
    organizationId: string,
    workerId: string,
    caller?: { userId: string; permissions: string[] }
  ) {
    if (!workerId) throw new BadRequestException('workerId is required');
    const scoped = await this.selfClockWorkerId(organizationId, workerId, caller);
    workerId = scoped.workerId;

    const now = new Date();
    let existing = await this.attendanceRepo.findByWorkerAndDate(organizationId, workerId, now);

    // Overnight shift: yesterday's record is still open — close that one.
    if (existing?.clockOut) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const prev = await this.attendanceRepo.findByWorkerAndDate(organizationId, workerId, yesterday);
      if (prev && !prev.clockOut) existing = prev;
    }

    if (!existing) throw new NotFoundException('No clock-in record found for today');
    if (existing.clockOut) throw new ConflictException('Worker already clocked out today');

    const hoursWorked = existing.clockIn
      ? HrApplicationService.roundHours(new Date(existing.clockIn), now)
      : null;

    const updated = await this.attendanceRepo.update(existing.id, { clockOut: now, hoursWorked });
    await this.eventService.emitHrEvent('updated', { entity: 'attendance', data: updated });
    return HrApplicationService.serializeAttendance(updated);
  }

  async updateAttendance(id: string, organizationId: string, data: Partial<{
    status: string;
    clockIn: string;
    clockOut: string;
    hoursWorked: number;
    notes: string;
  }>) {
    const existing = await this.attendanceRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Attendance record not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.clockIn !== undefined) {
      updateData.clockIn = data.clockIn ? HrApplicationService.toClockTimestamp(existing.date, data.clockIn) : null;
    }
    if (data.clockOut !== undefined) {
      updateData.clockOut = data.clockOut ? HrApplicationService.toClockTimestamp(existing.date, data.clockOut) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    // Re-derive hours and roll past-midnight checkouts unless explicitly set.
    const effIn = updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn;
    const effOut = updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut;
    const rolled = HrApplicationService.rollOvernight(
      effIn ? new Date(effIn) : null,
      effOut ? new Date(effOut) : null
    );
    if (updateData.clockOut !== undefined && rolled && effOut && rolled.getTime() !== new Date(effOut).getTime()) {
      updateData.clockOut = rolled;
    }
    if (data.hoursWorked !== undefined) {
      updateData.hoursWorked = data.hoursWorked;
    } else if (effIn && effOut) {
      updateData.hoursWorked = HrApplicationService.roundHours(new Date(effIn), new Date(updateData.clockOut ?? effOut));
    }

    const updated = await this.attendanceRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'attendance', data: updated });
    return HrApplicationService.serializeAttendance(updated);
  }

  async bulkCreateAttendance(organizationId: string, records: {
    workerId: string;
    workerName: string;
    date: string;
    status: string;
    clockIn?: string;
    clockOut?: string;
    hoursWorked?: number;
    notes?: string;
  }[]) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('records array is required');
    }

    const count = await this.attendanceRepo.createMany(records.map((r) => {
      const day = new Date(r.date);
      const inTs = HrApplicationService.toClockTimestamp(day, r.clockIn);
      const outTs = HrApplicationService.rollOvernight(inTs, HrApplicationService.toClockTimestamp(day, r.clockOut));
      return {
        organizationId,
        workerId: r.workerId,
        workerName: r.workerName,
        date: day,
        status: r.status,
        clockIn: inTs,
        clockOut: outTs,
        hoursWorked: r.hoursWorked ?? HrApplicationService.roundHours(inTs, outTs),
        notes: r.notes?.trim() || null,
      };
    }));

    return { count };
  }

  // Task operations
  async getTasks(organizationId: string, userPermissions: string[], userId: string, filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    farmId?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const processedFilters: any = { ...filters };
    delete processedFilters.page;
    delete processedFilters.limit;

    if (filters?.status) {
      const status = String(filters.status).toUpperCase();
      if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
        throw new BadRequestException('Invalid status filter');
      }
      processedFilters.status = status;
    }
    if (filters?.priority) {
      const priority = String(filters.priority).toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
        throw new BadRequestException('Invalid priority filter');
      }
      processedFilters.priority = priority;
    }

    // Self-service (worker.* / no hr.write): see your own tasks whether the
    // admin assigned by user id or by worker id, and compute stats from that
    // same set instead of the org-wide count.
    const scoped = !userPermissions.includes('hr.write');
    if (scoped) {
      const self = await this.selfWorker(organizationId, userId);
      processedFilters.assignedToIds = [userId, ...(self ? [self.id] : [])];
    }

    const page = Math.floor(Number(filters?.page));
    const paginate = filters?.page && Number.isFinite(page) && page >= 1;
    const limitRaw = Math.floor(Number(filters?.limit));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;

    if (paginate) {
      const { rows, total } = await this.taskRepo.findManyWithCount(
        organizationId,
        processedFilters,
        page,
        limit
      );
      const stats = scoped
        ? HrApplicationService.countTaskStatus(rows)
        : await this.taskRepo.getStatusStats(organizationId);
      return {
        data: rows,
        stats,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const tasks = await this.taskRepo.findByOrganizationId(organizationId, processedFilters);
    const stats = scoped
      ? HrApplicationService.countTaskStatus(tasks)
      : await this.taskRepo.getStatusStats(organizationId);

    return { data: tasks, stats };
  }

  async getTaskById(id: string, organizationId: string, userPermissions?: string[], userId?: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundException('Task not found');

    if (userPermissions && !userPermissions.includes('hr.write')) {
      const self = await this.selfWorker(organizationId, userId ?? '');
      const visibleTo = [userId, ...(self ? [self.id] : [])].filter(Boolean);
      if (!task.assignedToId || !visibleTo.includes(task.assignedToId)) {
        throw new ForbiddenException('Task not assigned to you');
      }
    }

    const [comments, attachments] = await Promise.all([
      prisma.taskComment.findMany({
        where: { taskId: id, organizationId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.taskAttachment.findMany({
        where: { taskId: id, organizationId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { ...task, comments, attachments };
  }

  async createTask(organizationId: string, userPermissions: string[], user: any, data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedToId?: string;
    assignedToName?: string;
    farmId?: string;
    dueDate?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
  }) {
    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate, isRecurring, recurrenceRule } = data;
    if (!title) throw new BadRequestException('Title is required');

    const task = await this.taskRepo.create({
      organizationId,
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || 'MEDIUM',
      status: status || 'PENDING',
      assignedToId: assignedToId || null,
      assignedToName: assignedToName || null,
      createdById: user?.sub || null,
      createdByName: user?.email || null,
      farmId: farmId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: null,
      isRecurring: Boolean(isRecurring),
      recurrenceRule: isRecurring ? recurrenceRule || 'WEEKLY' : null,
      nextDueAt: isRecurring && dueDate ? new Date(dueDate) : null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'task', data: task });
    // Producer: assignee gets the task in their inbox (+ push).
    const creatorId = user?.id ?? user?.sub ?? null;
    if (task.assignedToId && task.assignedToId !== creatorId) {
      this.notify([task.assignedToId], organizationId, {
        title: 'New task assigned',
        message:
          `"${task.title}"${task.dueDate ? ` — due ${HrApplicationService.formatDate(task.dueDate)}` : ''}` +
          `${task.priority ? ` (${task.priority} priority)` : ''}`,
        type: task.priority === 'HIGH' || task.priority === 'URGENT' ? 'ALERT' : 'INFO',
        link: '/tasks',
        entityType: 'Task',
        entityId: task.id,
      });
    }
    return task;
  }

  async updateTask(id: string, organizationId: string, userPermissions: string[], userId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedToId?: string;
    assignedToName?: string;
    farmId?: string;
    dueDate?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
  }) {
    const existing = await this.taskRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Task not found');

    if (!userPermissions.includes('hr.write')) {
      if (existing.assignedToId !== userId && existing.assignedToId !== (await this.selfWorker(organizationId, userId))?.id) {
        throw new ForbiddenException('Cannot update tasks not assigned to you');
      }
      if (!data.status) throw new BadRequestException('Status is required');
      const updated = await this.taskRepo.update(id, {
        status: data.status,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      });
      await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
      if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        await this.spawnNextOccurrence(existing, organizationId);
      }
      return updated;
    }

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate, isRecurring, recurrenceRule } = data;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') updateData.completedAt = new Date();
      else updateData.completedAt = null;
    }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName || null;
    if (farmId !== undefined) updateData.farmId = farmId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring);
    if (recurrenceRule !== undefined) updateData.recurrenceRule = recurrenceRule || null;
    if (isRecurring !== false && (isRecurring || existing.isRecurring) && updateData.dueDate !== undefined && updateData.dueDate !== null) {
      updateData.nextDueAt = updateData.dueDate;
    }

    const updated = await this.taskRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
    if (updateData.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.spawnNextOccurrence(existing, organizationId);
    }
    // Producer: a reassignment lands in the new assignee's inbox.
    if (updateData.assignedToId && updateData.assignedToId !== existing.assignedToId) {
      this.notify([updateData.assignedToId], organizationId, {
        title: 'Task assigned to you',
        message:
          `"${updated.title}"${updated.dueDate ? ` — due ${HrApplicationService.formatDate(updated.dueDate)}` : ''}` +
          `${updated.priority ? ` (${updated.priority} priority)` : ''}`,
        type: updated.priority === 'HIGH' || updated.priority === 'URGENT' ? 'ALERT' : 'INFO',
        link: '/tasks',
        entityType: 'Task',
        entityId: id,
      });
    }
    return updated;
  }

  async deleteTask(id: string, organizationId: string) {
    const existing = await this.taskRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Task not found');
    await this.eventService.emitHrEvent('deleted', { entity: 'task', id });
    return this.taskRepo.delete(id);
  }

  async updateTaskStatus(id: string, organizationId: string, status: string) {
    if (!status) throw new BadRequestException('Status is required');

    const existing = await this.taskRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Task not found');

    const updated = await this.taskRepo.update(id, {
      status,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
    });
    await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.spawnNextOccurrence(existing, organizationId);
    }
    return updated;
  }

  /**
   * Recurring tasks clone themselves on completion: the next occurrence takes
   * the advanced due date and the source row stays where it is. No scheduler
   * needed — completion is the trigger.
   */
  private async spawnNextOccurrence(existing: Task, organizationId: string) {
    if (!existing.isRecurring) return;
    const base = existing.nextDueAt ?? existing.dueDate;
    if (!base) return;
    const nextDue = HrApplicationService.advanceDue(base, existing.recurrenceRule);
    if (!nextDue) return;

    try {
      const next = await this.taskRepo.create({
        organizationId,
        title: existing.title,
        description: existing.description,
        priority: existing.priority,
        status: 'PENDING',
        assignedToId: existing.assignedToId,
        assignedToName: existing.assignedToName,
        createdById: existing.createdById,
        createdByName: existing.createdByName,
        farmId: existing.farmId,
        dueDate: nextDue,
        completedAt: null,
        isRecurring: true,
        recurrenceRule: existing.recurrenceRule,
        nextDueAt: HrApplicationService.advanceDue(nextDue, existing.recurrenceRule),
      });
      await this.eventService.emitHrEvent('created', { entity: 'task', data: next });
      this.notify([next.assignedToId], organizationId, {
        title: 'Recurring task is due again',
        message: `"${next.title}" — due ${HrApplicationService.formatDate(nextDue)}`,
        type: 'INFO',
        link: '/tasks',
        entityType: 'Task',
        entityId: next.id,
      });
    } catch (error: any) {
      this.logger.error(`Failed to spawn next occurrence of task ${existing.id}: ${error?.message}`);
    }
  }

  // ── Task comments & attachments ────────────────────────────────────────

  async getTaskComments(organizationId: string, taskId: string) {
    const task = await this.taskRepo.findById(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    return prisma.taskComment.findMany({
      where: { taskId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTaskComment(
    organizationId: string,
    taskId: string,
    author: { id: string | null; name: string },
    body: string
  ) {
    const task = await this.taskRepo.findById(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (!body?.trim()) throw new BadRequestException('Comment body is required');

    const comment = await prisma.taskComment.create({
      data: {
        organizationId,
        taskId,
        authorId: author.id,
        authorName: author.name || 'Unknown',
        body: body.trim(),
      },
    });
    await this.eventService.emitHrEvent('created', { entity: 'taskComment', data: comment });

    // Tell the assignee (and the task's creator) someone chimed in.
    this.notify([task.assignedToId, task.createdById], organizationId, {
      title: 'New comment on your task',
      message: `"${task.title}" — ${author.name}: ${body.trim().slice(0, 120)}`,
      type: 'INFO',
      link: '/tasks',
      entityType: 'Task',
      entityId: taskId,
    });
    return comment;
  }

  async deleteTaskComment(
    organizationId: string,
    commentId: string,
    caller: { userId: string; permissions: string[] }
  ) {
    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, organizationId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const isAuthor = Boolean(comment.authorId) && comment.authorId === caller.userId;
    const canModerate =
      caller.permissions.includes('hr.delete') || caller.permissions.includes('hr.write');
    if (!isAuthor && !canModerate) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await prisma.taskComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    await this.eventService.emitHrEvent('deleted', { entity: 'taskComment', id: commentId });
    return { id: commentId, deleted: true };
  }

  async getTaskAttachments(organizationId: string, taskId: string) {
    const task = await this.taskRepo.findById(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    return prisma.taskAttachment.findMany({
      where: { taskId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTaskAttachment(
    organizationId: string,
    taskId: string,
    uploader: { id: string | null; name: string },
    data: { fileName: string; fileUrl: string; fileSize?: number }
  ) {
    const task = await this.taskRepo.findById(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (!data.fileName?.trim() || !data.fileUrl?.trim()) {
      throw new BadRequestException('fileName and fileUrl are required');
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        organizationId,
        taskId,
        fileName: data.fileName.trim(),
        fileUrl: data.fileUrl.trim(),
        fileSize: data.fileSize ?? null,
        uploadedById: uploader.id,
        uploadedByName: uploader.name || null,
      },
    });
    await this.eventService.emitHrEvent('created', { entity: 'taskAttachment', data: attachment });
    return attachment;
  }

  async deleteTaskAttachment(
    organizationId: string,
    attachmentId: string,
    caller: { userId: string; permissions: string[] }
  ) {
    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, organizationId, deletedAt: null },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const isOwner = Boolean(attachment.uploadedById) && attachment.uploadedById === caller.userId;
    const canModerate =
      caller.permissions.includes('hr.delete') || caller.permissions.includes('hr.write');
    if (!isOwner && !canModerate) {
      throw new ForbiddenException('You can only remove your own attachments');
    }

    await prisma.taskAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
    await this.eventService.emitHrEvent('deleted', { entity: 'taskAttachment', id: attachmentId });
    return { id: attachmentId, deleted: true };
  }

  // Shift operations
  async getShifts(organizationId: string) {
    return this.shiftRepo.findByOrganizationId(organizationId);
  }

  async createShift(organizationId: string, data: {
    name: string;
    startTime: string;
    endTime: string;
    color?: string;
    daysOfWeek?: string[];
    days?: string[]; // legacy/mobile alias
  }) {
    const { name, startTime, endTime, color } = data;
    if (!name || !startTime || !endTime) {
      throw new BadRequestException('Name, startTime, and endTime are required');
    }

    const existing = await this.shiftRepo.findByName(organizationId, name.trim());
    if (existing) throw new ConflictException('Shift already exists');

    const shift = await this.shiftRepo.create({
      organizationId,
      name: name.trim(),
      startTime,
      endTime,
      daysOfWeek: HrApplicationService.normalizeDays(data.daysOfWeek ?? data.days),
      color: color || '#3B82F6',
      isActive: true,
    });
    await this.eventService.emitHrEvent('created', { entity: 'shift', data: shift });
    return shift;
  }

  async updateShift(id: string, organizationId: string, data: Partial<{
    name: string;
    startTime: string;
    endTime: string;
    color: string;
    isActive: boolean;
    daysOfWeek: string[];
    days: string[];
  }>) {
    const existing = await this.shiftRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Shift not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.daysOfWeek !== undefined || data.days !== undefined) {
      updateData.daysOfWeek = HrApplicationService.normalizeDays(data.daysOfWeek ?? data.days);
    }

    const updated = await this.shiftRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'shift', data: updated });
    return updated;
  }

  async deleteShift(id: string, organizationId: string) {
    const existing = await this.shiftRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Shift not found');

    const assignmentCount = await this.shiftRepo.countAssignments(id);
    if (assignmentCount > 0) {
      throw new ConflictException('Cannot delete shift with existing assignments');
    }

    await this.eventService.emitHrEvent('deleted', { entity: 'shift', id });
    return this.shiftRepo.delete(id);
  }

  // Shift Assignment operations
  async getShiftAssignments(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const processedFilters: any = {};
    if (filters?.userId) processedFilters.userId = filters.userId;
    if (filters?.startDate) processedFilters.startDate = new Date(filters.startDate);
    if (filters?.endDate) processedFilters.endDate = new Date(filters.endDate);

    const rows = await this.shiftAssignmentRepo.findByOrganizationId(organizationId, processedFilters);

    // Attach the assignee's display name — ShiftAssignment only stores a bare
    // userId, and roster viewers (including worker.read callers) can't list
    // users themselves.
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    if (userIds.length === 0) return rows;
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameByUserId = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()])
    );
    return rows.map((r) => ({
      ...r,
      userName: nameByUserId.get(r.userId) ?? null,
    }));
  }

  /**
   * Cross-shift double-booking guard: a user may hold several shifts on one
   * day (morning + evening is legitimate), but two shifts whose windows
   * intersect are not. Overnight windows (endTime <= startTime) wrap midnight.
   */
  private async assertNoShiftOverlap(
    organizationId: string,
    assignUserId: string,
    date: Date,
    shift: Shift,
    excludeAssignmentId?: string
  ) {
    const target = HrApplicationService.shiftInterval(date, shift);
    if (!target) return; // unparseable times — duplicate check still applies

    const from = new Date(date);
    from.setDate(from.getDate() - 1);
    const to = new Date(date);
    to.setDate(to.getDate() + 1);

    const neighbours = await this.shiftAssignmentRepo.findByOrganizationId(organizationId, {
      userId: assignUserId,
      startDate: from,
      endDate: to,
    });

    for (const other of neighbours) {
      if (excludeAssignmentId && other.id === excludeAssignmentId) continue;
      // findByOrganizationId includes the shift relation on each row.
      const included = (other as { shift?: Shift }).shift;
      const otherShift = included ?? (await this.shiftRepo.findById(other.shiftId, organizationId));
      if (!otherShift) continue;
      const window = HrApplicationService.shiftInterval(other.date, otherShift);
      if (!window) continue;
      if (target[0] < window[1] && window[0] < target[1]) {
        throw new ConflictException(
          `Overlaps "${otherShift.name}" on ${HrApplicationService.formatDate(other.date)}`
        );
      }
    }
  }

  /** Assignment day must be one the shift actually runs (if days are set). */
  private assertRunsOnDay(date: Date, shift: Shift) {
    if (!HrApplicationService.runsOnDay(date, shift)) {
      throw new BadRequestException(
        `"${shift.name}" does not run on ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
      );
    }
  }

  async createShiftAssignment(organizationId: string, data: {
    shiftId: string;
    userId: string;
    date: string;
    notes?: string;
  }) {
    const { shiftId, userId: assignUserId, date, notes } = data;
    if (!shiftId || !assignUserId || !date) {
      throw new BadRequestException('shiftId, userId, and date are required');
    }

    const shift = await this.shiftRepo.findById(shiftId, organizationId);
    if (!shift) throw new NotFoundException('Shift not found');

    const day = new Date(date);
    const existing = await this.shiftAssignmentRepo.findByShiftAndUserAndDate(shiftId, assignUserId, day);
    if (existing) throw new ConflictException('User already assigned to this shift on this date');

    this.assertRunsOnDay(day, shift);
    await this.assertNoShiftOverlap(organizationId, assignUserId, day, shift);

    const assignment = await this.shiftAssignmentRepo.create({
      organizationId,
      shiftId,
      userId: assignUserId,
      date: day,
      notes: notes || null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'shiftAssignment', data: assignment });
    return assignment;
  }

  async updateShiftAssignment(id: string, organizationId: string, data: {
    shiftId?: string;
    date?: string;
    notes?: string;
  }) {
    const existing = await this.shiftAssignmentRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Assignment not found');

    const shiftId = data.shiftId ?? existing.shiftId;
    const shift = await this.shiftRepo.findById(shiftId, organizationId);
    if (!shift) throw new NotFoundException('Shift not found');

    const day = data.date ? new Date(data.date) : new Date(existing.date);
    const clash = await this.shiftAssignmentRepo.findByShiftAndUserAndDate(shiftId, existing.userId, day);
    if (clash && clash.id !== id) {
      throw new ConflictException('User already assigned to this shift on this date');
    }

    this.assertRunsOnDay(day, shift);
    await this.assertNoShiftOverlap(organizationId, existing.userId, day, shift, id);

    const updateData: any = {};
    if (data.shiftId !== undefined) updateData.shiftId = shiftId;
    if (data.date !== undefined) updateData.date = day;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const updated = await this.shiftAssignmentRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'shiftAssignment', data: updated });
    return updated;
  }

  async bulkCreateShiftAssignments(organizationId: string, assignments: {
    shiftId: string;
    userId: string;
    date: string;
    notes?: string;
  }[]) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestException('assignments array is required');
    }

    const count = await this.shiftAssignmentRepo.createMany(assignments.map((a) => ({
      organizationId,
      shiftId: a.shiftId,
      userId: a.userId,
      date: new Date(a.date),
      notes: a.notes || null,
    })));

    return { count };
  }

  async deleteShiftAssignment(id: string, organizationId: string) {
    const existing = await this.shiftAssignmentRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.eventService.emitHrEvent('deleted', { entity: 'shiftAssignment', id });
    return this.shiftAssignmentRepo.delete(id);
  }

  // Leave Type operations
  async getLeaveTypes(organizationId: string) {
    return this.leaveTypeRepo.findByOrganizationId(organizationId);
  }

  async createLeaveType(organizationId: string, data: {
    name: string;
    daysPerYear?: number;
    isPaid?: boolean;
  }) {
    const { name, daysPerYear, isPaid } = data;
    if (!name) throw new BadRequestException('Name is required');

    const existing = await this.leaveTypeRepo.findByName(organizationId, name.trim());
    if (existing) throw new ConflictException('Leave type already exists');

    const leaveType = await this.leaveTypeRepo.create({
      organizationId,
      name: name.trim(),
      daysPerYear: daysPerYear ?? 0,
      isPaid: isPaid ?? true,
      isActive: true,
    });
    await this.eventService.emitHrEvent('created', { entity: 'leaveType', data: leaveType });
    return leaveType;
  }

  async updateLeaveType(id: string, organizationId: string, data: Partial<{
    name: string;
    daysPerYear: number;
    isPaid: boolean;
    isActive: boolean;
  }>) {
    const existing = await this.leaveTypeRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave type not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.daysPerYear !== undefined) updateData.daysPerYear = data.daysPerYear;
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.leaveTypeRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'leaveType', data: updated });
    return updated;
  }

  async deleteLeaveType(id: string, organizationId: string) {
    const existing = await this.leaveTypeRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave type not found');

    const requestCount = await this.leaveTypeRepo.countRequests(id);
    if (requestCount > 0) {
      throw new ConflictException('Cannot delete leave type with existing requests');
    }

    await this.eventService.emitHrEvent('deleted', { entity: 'leaveType', id });
    return this.leaveTypeRepo.delete(id);
  }

  // Leave Request operations

  /**
   * The workers on approved leave spanning `date` (default today), joined to
   * their login user and the covering request + leave type. This is the
   * "who is off right now" signal the roster and workers list surface.
   */
  async getWorkersOnLeave(organizationId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const requests = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        userId: true,
        leaveType: { select: { name: true, isPaid: true } },
      },
    });
    if (requests.length === 0) return [];

    const workers = await prisma.worker.findMany({
      where: { organizationId, deletedAt: null, userId: { in: requests.map((r: any) => r.userId) } },
      select: { id: true, firstName: true, middleName: true, lastName: true, position: true, farmId: true, userId: true },
    });

    return requests
      .map((r: any) => {
        const worker = workers.find((w: any) => w.userId === r.userId);
        if (!worker) return null;
        return {
          workerId: worker.id,
          name: `${worker.firstName} ${worker.lastName}`.trim(),
          position: worker.position,
          farmId: worker.farmId,
          leaveRequestId: r.id,
          leaveType: r.leaveType?.name || null,
          isPaid: r.leaveType?.isPaid ?? null,
          startDate: r.startDate,
          endDate: r.endDate,
        };
      })
      .filter(Boolean);
  }

  async getLeaveRequests(organizationId: string, userPermissions: string[], userId: string, filters?: {
    status?: string;
    userId?: string;
    year?: number | string;
  }) {
    const processedFilters: any = {};
    if (filters?.status) processedFilters.status = filters.status;

    if (filters?.year) {
      const y = Math.floor(Number(filters.year));
      if (!Number.isFinite(y) || y < 1970 || y > 2200) {
        throw new BadRequestException('Invalid year filter');
      }
      processedFilters.startDate = new Date(Date.UTC(y, 0, 1));
      processedFilters.endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    }

    if (!userPermissions.includes('hr.write')) {
      processedFilters.userId = userId;
    } else if (filters?.userId) {
      processedFilters.userId = filters.userId;
    }

    const rows = await this.leaveRequestRepo.findByOrganizationId(organizationId, processedFilters);

    // Attach the requester's display name (and their worker record, when the
    // requester is a worker) so a manager can tell requests apart, and so the
    // edit form knows which worker a request belongs to.
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    if (userIds.length === 0) return rows;
    const [users, workers] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.worker.findMany({
        where: { organizationId, deletedAt: null, userId: { in: userIds } },
        select: { id: true, userId: true },
      }),
    ]);
    const nameByUserId = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const workerIdByUserId = new Map(workers.filter((w) => w.userId).map((w) => [w.userId as string, w.id]));

    return rows.map((r) => ({
      ...r,
      requesterName: nameByUserId.get(r.userId) ?? null,
      workerId: workerIdByUserId.get(r.userId) ?? null,
    }));
  }

  async createLeaveRequest(organizationId: string, userId: string, data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    workerId?: string;
  }, callerPermissions: string[] = []) {
    const { leaveTypeId, startDate, endDate, reason, workerId } = data;
    if (!leaveTypeId || !startDate || !endDate) {
      throw new BadRequestException('leaveTypeId, startDate, and endDate are required');
    }

    // A worker with leave.write may only file for themselves. Filing for
    // someone else (via workerId) is a manager action gated on hr.write, which
    // the route already requires — but re-check here so the rule can't be
    // bypassed by a future route that loosens the decorator.
    let targetUserId = userId;
    if (workerId) {
      if (!callerPermissions.includes('hr.write')) {
        throw new ForbiddenException('Only managers can file leave on behalf of a worker');
      }
      const worker = await this.workerRepo.findById(workerId, organizationId);
      if (!worker) throw new NotFoundException('Worker not found');
      // Legacy workers predate the login feature and may have no linked user.
      if (!worker.userId) throw new BadRequestException('This worker has no login account yet');
      targetUserId = worker.userId;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new BadRequestException('endDate must be after startDate');

    const days = this.countBusinessDays(start, end);

    const year = start.getFullYear();
    const balance = await this.leaveBalanceRepo.findByUserAndTypeAndYear(targetUserId, leaveTypeId, year);
    if (balance && (balance.usedDays + days) > balance.totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${balance.totalDays - balance.usedDays} days`);
    }

    const leaveRequest = await this.leaveRequestRepo.create({
      organizationId,
      userId: targetUserId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason: reason || null,
      status: 'PENDING',
      approvedById: null,
      approvedAt: null,
      rejectionReason: null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'leaveRequest', data: leaveRequest });
    // Producer: tell the org's approvers a request is waiting on them.
    void this.notifyLeaveApprovers(leaveRequest, organizationId);
    return leaveRequest;
  }

  /** Fan a new leave request out to every user holding `leave.approve`. */
  private async notifyLeaveApprovers(
    leaveRequest: {
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      days: number;
      reason: string | null;
    },
    organizationId: string
  ): Promise<void> {
    try {
      const approverIds = await this.userIdsForPermission(
        organizationId,
        'leave.approve',
        leaveRequest.userId
      );
      this.notify(approverIds, organizationId, {
        title: 'Leave request awaiting approval',
        message:
          `Leave requested for ${HrApplicationService.formatDate(leaveRequest.startDate)} – ` +
          `${HrApplicationService.formatDate(leaveRequest.endDate)} (${leaveRequest.days} day(s))` +
          `${leaveRequest.reason ? `: ${leaveRequest.reason}` : ''}.`,
        type: 'INFO',
        link: '/hr/leave/approvals',
        entityType: 'LeaveRequest',
        entityId: leaveRequest.id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to notify leave approvers for ${leaveRequest.id}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Monday–Friday days in [start, end] — weekends are never leave days.
   */
  private countBusinessDays(start: Date, end: Date): number {
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) days++;
      current.setDate(current.getDate() + 1);
    }
    if (days === 0) throw new BadRequestException('Leave must include at least one business day');
    return days;
  }

  /**
   * Modify a leave request. Workers (leave.write) may edit their own request
   * while it is still pending. Owners/managers (hr.write) may edit any request
   * in their organization: a pending one, a rejected one (which is resubmitted
   * as pending for re-approval), or an approved one (the balance debit is moved
   * to match the new type/dates/duration). The target user is immutable — to
   * move leave to someone else, cancel and refile.
   */
  async updateLeaveRequest(
    id: string,
    organizationId: string,
    callerUserId: string,
    data: { leaveTypeId?: string; startDate?: string; endDate?: string; reason?: string },
    callerPermissions: string[] = [],
  ) {
    const existing = await this.leaveRequestRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave request not found');

    const isManager = callerPermissions.includes('hr.write');
    if (!isManager && existing.userId !== callerUserId) {
      throw new ForbiddenException('Cannot modify leave requests from other users');
    }
    if (existing.status === 'CANCELLED') {
      throw new ConflictException('Cancelled requests cannot be modified');
    }
    // Workers may only touch their own pending request; touching an approved
    // or rejected one is a manager decision.
    if (!isManager && existing.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be modified');
    }

    const leaveTypeId = data.leaveTypeId || existing.leaveTypeId;
    const leaveType = await this.leaveTypeRepo.findById(leaveTypeId, organizationId);
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const start = data.startDate ? new Date(data.startDate) : new Date(existing.startDate);
    const end = data.endDate ? new Date(data.endDate) : new Date(existing.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (end < start) throw new BadRequestException('endDate must be after startDate');
    const days = this.countBusinessDays(start, end);

    const wasApproved = existing.status === 'APPROVED';
    const oldYear = new Date(existing.startDate).getFullYear();
    const newYear = start.getFullYear();

    if (!wasApproved) {
      // Pending/rejected requests have not been debited yet — same headroom
      // rule as create.
      const balance = await this.leaveBalanceRepo.findByUserAndTypeAndYear(existing.userId, leaveTypeId, newYear);
      if (balance && (balance.usedDays + days) > balance.totalDays) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${balance.totalDays - balance.usedDays} days`);
      }
    } else {
      // Approved: move the existing debit to the new type/year/duration.
      // Checks run before any mutation so a failure leaves balances untouched.
      const newRow = await this.leaveBalanceRepo.findByUserAndTypeAndYear(existing.userId, leaveTypeId, newYear);
      if (leaveTypeId === existing.leaveTypeId && newYear === oldYear) {
        const delta = days - existing.days;
        const total = newRow?.totalDays ?? leaveType.daysPerYear;
        if (delta !== 0) {
          if ((newRow?.usedDays ?? 0) + delta > total) {
            throw new BadRequestException(`Insufficient leave balance. Available: ${Math.max(total - (newRow?.usedDays ?? 0), 0)} days`);
          }
          // usedDays upsert increments, so a negative delta releases days.
          await this.leaveBalanceRepo.upsert({
            organizationId,
            userId: existing.userId,
            leaveTypeId,
            year: newYear,
            totalDays: total,
            usedDays: delta,
          });
        }
      } else {
        const newTotal = newRow?.totalDays ?? leaveType.daysPerYear;
        if ((newRow?.usedDays ?? 0) + days > newTotal) {
          throw new BadRequestException(`Insufficient leave balance. Available: ${Math.max(newTotal - (newRow?.usedDays ?? 0), 0)} days`);
        }
        const oldRow = await this.leaveBalanceRepo.findByUserAndTypeAndYear(existing.userId, existing.leaveTypeId, oldYear);
        if (oldRow) {
          await this.leaveBalanceRepo.upsert({
            organizationId,
            userId: existing.userId,
            leaveTypeId: existing.leaveTypeId,
            year: oldYear,
            totalDays: oldRow.totalDays,
            usedDays: -existing.days,
          });
        }
        await this.leaveBalanceRepo.upsert({
          organizationId,
          userId: existing.userId,
          leaveTypeId,
          year: newYear,
          totalDays: newTotal,
          usedDays: days,
        });
      }
    }

    const updated = await this.leaveRequestRepo.update(id, {
      leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      ...(data.reason !== undefined ? { reason: data.reason || null } : {}),
      // A fixed rejected request goes back into the approval queue.
      ...(existing.status === 'REJECTED'
        ? { status: 'PENDING', rejectionReason: null, approvedById: null, approvedAt: null }
        : {}),
    });
    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    return updated;
  }

  async approveLeaveRequest(id: string, organizationId: string, approverId: string) {
    const existing = await this.leaveRequestRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const updated = await this.leaveRequestRepo.update(id, {
      status: 'APPROVED',
      approvedById: approverId,
      approvedAt: new Date(),
    });

    const year = new Date(existing.startDate).getFullYear();
    // Preserve an existing allowance row (or initialise it from the leave
    // type's daysPerYear). Passing 0 here used to zero out totalDays, which
    // made every later balance/headroom check fail.
    const currentBalance = await this.leaveBalanceRepo.findByUserAndTypeAndYear(existing.userId, existing.leaveTypeId, year);
    const leaveType = await this.leaveTypeRepo.findById(existing.leaveTypeId, organizationId);
    await this.leaveBalanceRepo.upsert({
      organizationId: existing.organizationId,
      userId: existing.userId,
      leaveTypeId: existing.leaveTypeId,
      year,
      totalDays: currentBalance?.totalDays ?? leaveType?.daysPerYear ?? 0,
      usedDays: existing.days,
    });

    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    // Producer: SUCCESS/ALERT + entityType LeaveRequest drives the approved/
    // rejected email and push inside the notification module.
    this.notify([existing.userId], organizationId, {
      title: 'Leave request approved',
      message:
        `Your leave from ${HrApplicationService.formatDate(existing.startDate)} to ` +
        `${HrApplicationService.formatDate(existing.endDate)} (${existing.days} day(s)) was approved.`,
      type: 'SUCCESS',
      link: '/hr/leave',
      entityType: 'LeaveRequest',
      entityId: id,
    });
    return updated;
  }

  async rejectLeaveRequest(id: string, organizationId: string, approverId: string, rejectionReason?: string) {
    const existing = await this.leaveRequestRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const updated = await this.leaveRequestRepo.update(id, {
      status: 'REJECTED',
      approvedById: approverId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || null,
    });

    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    this.notify([existing.userId], organizationId, {
      title: 'Leave request rejected',
      message:
        `Your leave from ${HrApplicationService.formatDate(existing.startDate)} to ` +
        `${HrApplicationService.formatDate(existing.endDate)} was rejected` +
        `${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      type: 'ALERT',
      link: '/hr/leave',
      entityType: 'LeaveRequest',
      entityId: id,
    });
    return updated;
  }

  async cancelLeaveRequest(id: string, organizationId: string, userId: string) {
    const existing = await this.leaveRequestRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.userId !== userId) throw new ForbiddenException('Cannot cancel requests from other users');
    if (existing.status !== 'PENDING') throw new ConflictException('Only pending requests can be cancelled');

    const updated = await this.leaveRequestRepo.update(id, { status: 'CANCELLED' });
    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    return updated;
  }

  // Leave Balance operations
  async getLeaveBalance(organizationId: string, userId: string, year?: number) {
    const y = year || new Date().getFullYear();
    const balances = await this.leaveBalanceRepo.findByOrganizationAndUser(organizationId, userId, y);
    const types = await this.leaveTypeRepo.findByOrganizationId(organizationId);

    return types.map((t) => {
      const existing = balances.find((b) => b.leaveTypeId === t.id);
      return {
        leaveTypeId: t.id,
        leaveTypeName: t.name,
        isPaid: t.isPaid,
        totalDays: existing?.totalDays ?? t.daysPerYear,
        usedDays: existing?.usedDays ?? 0,
        remainingDays: (existing?.totalDays ?? t.daysPerYear) - (existing?.usedDays ?? 0),
      };
    });
  }

  async upsertLeaveBalance(organizationId: string, data: {
    userId: string;
    leaveTypeId: string;
    year: number;
    totalDays: number;
  }) {
    const { userId, leaveTypeId, year, totalDays } = data;
    if (!userId || !leaveTypeId || !year || totalDays === undefined) {
      throw new BadRequestException('userId, leaveTypeId, year, and totalDays are required');
    }

    return this.leaveBalanceRepo.upsert({
      organizationId,
      userId,
      leaveTypeId,
      year,
      totalDays,
      usedDays: 0,
    });
  }

  /**
   * Org-wide balance table for admins: one row per user, one column per leave
   * type. The single-user endpoint above only ever answers for the caller.
   */
  async getAllLeaveBalances(organizationId: string, year?: number) {
    const y = Math.floor(Number(year)) || new Date().getFullYear();

    const [balances, types, users] = await Promise.all([
      prisma.leaveBalance.findMany({
        where: { organizationId, year: y, deletedAt: null },
      }),
      this.leaveTypeRepo.findByOrganizationId(organizationId),
      prisma.user.findMany({
        where: { organizationId },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ lastName: 'asc' }],
      }),
    ]);

    return users.map((u) => ({
      userId: u.id,
      userName: [u.firstName, u.lastName].filter(Boolean).join(' '),
      email: u.email,
      leaveTypes: types.map((t) => {
        const existing = balances.find((b) => b.userId === u.id && b.leaveTypeId === t.id);
        return {
          leaveTypeId: t.id,
          leaveTypeName: t.name,
          isPaid: t.isPaid,
          totalDays: existing?.totalDays ?? t.daysPerYear,
          usedDays: existing?.usedDays ?? 0,
          remainingDays: (existing?.totalDays ?? t.daysPerYear) - (existing?.usedDays ?? 0),
        };
      }),
    }));
  }

  /** Approve/reject several leave requests in one call; per-row failures are
   *  reported back instead of aborting the batch. */
  async bulkLeaveDecision(
    organizationId: string,
    approverId: string,
    ids: string[],
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required');
    }
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException("action must be 'approve' or 'reject'");
    }

    const succeeded: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        if (action === 'approve') {
          await this.approveLeaveRequest(id, organizationId, approverId);
        } else {
          await this.rejectLeaveRequest(id, organizationId, approverId, rejectionReason);
        }
        succeeded.push(id);
      } catch (error: any) {
        failed.push({ id, error: error?.message || 'Failed' });
      }
    }

    return { succeeded, failed };
  }

  // Message operations
  async getInbox(organizationId: string, userId: string) {
    return this.messageRecipientRepo.findByRecipient(userId, organizationId);
  }

  async getSentMessages(organizationId: string, userId: string) {
    return this.messageRepo.findSentByUser(userId, organizationId);
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const count = await this.messageRecipientRepo.countUnread(userId, organizationId);
    return { count };
  }

  async getMessageById(id: string, userId: string, organizationId: string) {
    const message = await this.messageRepo.findById(id, organizationId);
    if (!message) throw new NotFoundException('Message not found');

    const recipient = await this.messageRecipientRepo.findByMessageAndRecipient(id, userId);
    if (recipient && !recipient.isRead) {
      await this.messageRecipientRepo.markAsRead(recipient.id);
    }

    return { ...message, isRead: true };
  }

  /** People the caller can message: active users of their own organization. */
  async getMessageRecipients(organizationId: string, userId: string) {
    const { prisma } = await import('@farm/database');
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true, id: { not: userId } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map((u: any) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role?.name || null,
    }));
  }

  async createMessage(organizationId: string, senderId: string, senderName: string, data: {
    subject: string;
    body: string;
    recipientIds: string[];
    priority?: string;
  }) {
    const { subject, body: messageBody, recipientIds, priority } = data;
    const uniqueIds = [...new Set((Array.isArray(recipientIds) ? recipientIds : []).filter(Boolean))];
    if (!subject || !messageBody || uniqueIds.length === 0) {
      throw new BadRequestException('subject, body, and recipientIds are required');
    }

    // Recipients must be real, active users of the caller's organization.
    // Ids from other organizations would silently never land (inboxes are
    // organization-scoped), and recipient names are stored denormalized for
    // the Sent list, so resolve them here instead of writing blanks.
    const { prisma } = await import('@farm/database');
    const recipients = await prisma.user.findMany({
      where: { id: { in: uniqueIds }, organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients in your organization');
    }

    const message = await this.messageRepo.create({
      organizationId,
      senderId,
      senderName,
      subject: subject.trim(),
      body: messageBody.trim(),
      priority: priority || 'NORMAL',
    });

    await this.messageRecipientRepo.createMany(
      recipients.map((r: any) => ({
        messageId: message.id,
        recipientId: r.id,
        recipientName: `${r.firstName} ${r.lastName}`.trim(),
        organizationId,
      }))
    );

    await this.eventService.emitHrEvent('created', { entity: 'message', data: message });
    // Producer: one in-app row (+ email/push) per recipient.
    const isHighPriority = priority === 'HIGH' || priority === 'URGENT' || priority === 'CRITICAL';
    this.notify(
      recipients.map((r: any) => r.id),
      organizationId,
      {
        title: subject.trim(),
        message: `New message from ${senderName}`,
        type: isHighPriority ? 'ALERT' : 'INFO',
        link: '/messages',
        entityType: 'Message',
        entityId: message.id,
      }
    );
    return message;
  }

  async deleteMessage(id: string, userId: string, organizationId: string) {
    const message = await this.messageRepo.findById(id, organizationId);
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId === userId) {
      await this.messageRepo.delete(id);
    } else {
      const recipient = await this.messageRecipientRepo.findByMessageAndRecipient(id, userId);
      if (!recipient) throw new ForbiddenException('Not authorized');
      await this.messageRecipientRepo.delete(recipient.id);
    }
  }

  // Correspondence operations
  async getCorrespondence(organizationId: string, filters?: {
    status?: string;
    type?: string;
    category?: string;
    archived?: string;
  }) {
    const processedFilters: any = {};
    if (filters?.status) processedFilters.status = filters.status;
    if (filters?.type) processedFilters.type = filters.type;
    if (filters?.category) processedFilters.category = filters.category;
    if (filters?.archived === 'true') processedFilters.archived = true;
    else if (filters?.archived === 'false') processedFilters.archived = false;

    return this.correspondenceRepo.findByOrganizationId(organizationId, processedFilters);
  }

  async getCorrespondenceStats(organizationId: string) {
    return this.correspondenceRepo.getStats(organizationId);
  }

  async getCorrespondenceById(id: string, organizationId: string) {
    const item = await this.correspondenceRepo.findById(id, organizationId);
    if (!item) throw new NotFoundException('Correspondence not found');
    return item;
  }

  async createCorrespondence(organizationId: string, userId: string, userName: string, data: {
    title: string;
    type: string;
    category?: string;
    from?: string;
    to?: string;
    content?: string;
    status?: string;
    priority?: string;
    receivedDate?: string;
  }) {
    const { title, type, category, from, to, content, status, priority, receivedDate } = data;
    if (!title?.trim()) throw new BadRequestException('Title is required');
    if (!type) throw new BadRequestException('Type is required (INCOMING, OUTGOING, INTERNAL)');

    const year = new Date().getFullYear();
    const count = await this.correspondenceRepo.countByOrganizationAndYear(organizationId, year);
    const referenceNumber = `COR-${year}-${String(count + 1).padStart(3, '0')}`;

    const correspondence = await this.correspondenceRepo.create({
      organizationId,
      referenceNumber,
      title: title.trim(),
      type,
      category: category || 'OTHER',
      from: from || null,
      to: to || null,
      content: content || null,
      status: status || 'DRAFT',
      priority: priority || 'NORMAL',
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      createdById: userId,
      createdByName: userName,
      archivedAt: null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'correspondence', data: correspondence });
    return correspondence;
  }

  async updateCorrespondence(id: string, organizationId: string, data: Partial<{
    title: string;
    type: string;
    category: string;
    from: string;
    to: string;
    content: string;
    status: string;
    priority: string;
    receivedDate: string;
  }>) {
    const existing = await this.correspondenceRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.from !== undefined) updateData.from = data.from;
    if (data.to !== undefined) updateData.to = data.to;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.receivedDate !== undefined) {
      updateData.receivedDate = data.receivedDate ? new Date(data.receivedDate) : null;
    }

    const updated = await this.correspondenceRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'correspondence', data: updated });
    return updated;
  }

  async archiveCorrespondence(id: string, organizationId: string) {
    const existing = await this.correspondenceRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const updated = await this.correspondenceRepo.update(id, {
      archivedAt: new Date(),
      status: 'ARCHIVED',
    });
    await this.eventService.emitHrEvent('updated', { entity: 'correspondence', data: updated });
    return updated;
  }

  async unarchiveCorrespondence(id: string, organizationId: string) {
    const existing = await this.correspondenceRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const updated = await this.correspondenceRepo.update(id, {
      archivedAt: null,
      status: 'RECEIVED',
    });
    await this.eventService.emitHrEvent('updated', { entity: 'correspondence', data: updated });
    return updated;
  }

  async deleteCorrespondence(id: string, organizationId: string) {
    const existing = await this.correspondenceRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Correspondence not found');
    await this.eventService.emitHrEvent('deleted', { entity: 'correspondence', id });
    return this.correspondenceRepo.delete(id);
  }

  async addCorrespondenceAttachment(correspondenceId: string, organizationId: string, userId: string, data: {
    fileName: string;
    fileSize?: number;
    fileUrl: string;
    fileType?: string;
  }) {
    const existing = await this.correspondenceRepo.findById(correspondenceId, organizationId);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const { fileName, fileSize, fileUrl, fileType } = data;
    if (!fileName || !fileUrl) throw new BadRequestException('fileName and fileUrl are required');

    return this.correspondenceAttachmentRepo.create({
      correspondenceId,
      fileName,
      fileSize: fileSize || 0,
      fileUrl,
      fileType: fileType || null,
      uploadedById: userId,
      organizationId,
    });
  }

  async getCorrespondenceAttachment(id: string, organizationId: string) {
    const attachment = await this.correspondenceAttachmentRepo.findById(id, organizationId);
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async deleteCorrespondenceAttachment(id: string, organizationId: string) {
    const existing = await this.correspondenceAttachmentRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Attachment not found');
    return this.correspondenceAttachmentRepo.delete(id);
  }
}
