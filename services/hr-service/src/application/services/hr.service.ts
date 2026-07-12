import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
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
import { HrEventService } from '../../infrastructure/messaging/hr.event.service';

const CAN_CREATE_TASK_ROLES = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];
const CAN_APPROVE_LEAVE_ROLES = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];

@Injectable()
export class HrApplicationService {
  constructor(
    private readonly workerRepo: WorkerRepository,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly taskRepo: TaskRepository,
    private readonly shiftRepo: ShiftRepository,
    private readonly shiftAssignmentRepo: ShiftAssignmentRepository,
    private readonly leaveTypeRepo: LeaveTypeRepository,
    private readonly leaveRequestRepo: LeaveRequestRepository,
    private readonly leaveBalanceRepo: LeaveBalanceRepository,
    private readonly messageRepo: MessageRepository,
    private readonly messageRecipientRepo: MessageRecipientRepository,
    private readonly correspondenceRepo: CorrespondenceRepository,
    private readonly correspondenceAttachmentRepo: CorrespondenceAttachmentRepository,
    private readonly eventService: HrEventService,
  ) {}

  // Worker operations
  async getWorkerById(id: string) {
    const worker = await this.workerRepo.findById(id);
    if (!worker) throw new NotFoundException(`Worker with ID ${id} not found`);
    return worker;
  }

  async getAllWorkers(organizationId: string) {
    return this.workerRepo.findByOrganizationId(organizationId);
  }

  async createWorker(data: {
    organizationId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position: string;
    department?: string;
    hireDate: Date;
  }) {
    const worker = await this.workerRepo.create({
      ...data,
      phone: data.phone || null,
      department: data.department || null,
      status: 'ACTIVE',
    });
    await this.eventService.emitHrEvent('created', { entity: 'worker', data: worker });
    return worker;
  }

  async updateWorker(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    status: string;
  }>) {
    await this.getWorkerById(id);
    const updated = await this.workerRepo.update(id, data);
    await this.eventService.emitHrEvent('updated', { entity: 'worker', data: updated });
    return updated;
  }

  async deleteWorker(id: string) {
    await this.getWorkerById(id);
    await this.eventService.emitHrEvent('deleted', { entity: 'worker', id });
    return this.workerRepo.delete(id);
  }

  // Attendance operations
  async getAttendance(organizationId: string, filters?: {
    workerId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
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
    return this.attendanceRepo.findByOrganizationId(organizationId, processedFilters);
  }

  async getTodayAttendance(organizationId: string) {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const records = await this.attendanceRepo.findByOrganizationId(organizationId, {
      startDate: start,
      endDate: end,
    });

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r) => r.status === 'ON_LEAVE').length,
    };

    return { records, summary };
  }

  async getAttendanceSummary(organizationId: string, workerId: string, month?: number, year?: number) {
    if (!workerId) throw new BadRequestException('workerId is required');

    const m = month ?? new Date().getMonth();
    const y = year ?? new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await this.attendanceRepo.findByOrganizationId(organizationId, {
      workerId,
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

    return { records, summary: summaryData };
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

    const attendance = await this.attendanceRepo.create({
      organizationId,
      workerId,
      workerName,
      date: new Date(date),
      status,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      hoursWorked: hoursWorked || null,
      notes: notes?.trim() || null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'attendance', data: attendance });
    return attendance;
  }

  async clockIn(organizationId: string, workerId: string, workerName: string) {
    if (!workerId || !workerName) {
      throw new BadRequestException('workerId and workerName are required');
    }

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

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
      clockIn: clockInTime,
      clockOut: null,
      hoursWorked: null,
      notes: null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'attendance', data: attendance });
    return attendance;
  }

  async clockOut(organizationId: string, workerId: string) {
    if (!workerId) throw new BadRequestException('workerId is required');

    const today = new Date();
    const existing = await this.attendanceRepo.findByWorkerAndDate(organizationId, workerId, today);

    if (!existing) throw new NotFoundException('No clock-in record found for today');
    if (existing.clockOut) throw new ConflictException('Worker already clocked out today');

    const clockOutTime = today.toTimeString().slice(0, 5);
    const hoursWorked = existing.clockIn
      ? Math.round(((parseInt(clockOutTime.slice(0, 2)) * 60 + parseInt(clockOutTime.slice(3))) -
          (parseInt(existing.clockIn.slice(0, 2)) * 60 + parseInt(existing.clockIn.slice(3)))) / 60 * 100) / 100
      : null;

    const updated = await this.attendanceRepo.update(existing.id, { clockOut: clockOutTime, hoursWorked });
    await this.eventService.emitHrEvent('updated', { entity: 'attendance', data: updated });
    return updated;
  }

  async updateAttendance(id: string, data: Partial<{
    status: string;
    clockIn: string;
    clockOut: string;
    hoursWorked: number;
    notes: string;
  }>) {
    const existing = await this.attendanceRepo.findById(id);
    if (!existing) throw new NotFoundException('Attendance record not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.clockIn !== undefined) updateData.clockIn = data.clockIn;
    if (data.clockOut !== undefined) updateData.clockOut = data.clockOut;
    if (data.hoursWorked !== undefined) updateData.hoursWorked = data.hoursWorked;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const updated = await this.attendanceRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'attendance', data: updated });
    return updated;
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

    const count = await this.attendanceRepo.createMany(records.map((r) => ({
      organizationId,
      workerId: r.workerId,
      workerName: r.workerName,
      date: new Date(r.date),
      status: r.status,
      clockIn: r.clockIn || null,
      clockOut: r.clockOut || null,
      hoursWorked: r.hoursWorked || null,
      notes: r.notes?.trim() || null,
    })));

    return { count };
  }

  // Task operations
  async getTasks(organizationId: string, userRole: string, userId: string, filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    farmId?: string;
    search?: string;
  }) {
    const processedFilters: any = { ...filters };

    if (userRole === 'WORKER') {
      processedFilters.assignedToId = userId;
    }

    const tasks = await this.taskRepo.findByOrganizationId(organizationId, processedFilters);
    const stats = await this.taskRepo.getStatusStats(organizationId);

    return { data: tasks, stats };
  }

  async getTaskById(id: string) {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async createTask(organizationId: string, userRole: string, user: any, data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedToId?: string;
    assignedToName?: string;
    farmId?: string;
    dueDate?: string;
  }) {
    if (!CAN_CREATE_TASK_ROLES.includes(userRole)) {
      throw new ForbiddenException('You do not have permission to create tasks');
    }

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = data;
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
    });
    await this.eventService.emitHrEvent('created', { entity: 'task', data: task });
    return task;
  }

  async updateTask(id: string, userRole: string, userId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedToId?: string;
    assignedToName?: string;
    farmId?: string;
    dueDate?: string;
  }) {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');

    if (userRole === 'WORKER') {
      if (existing.assignedToId !== userId) {
        throw new ForbiddenException('Cannot update tasks not assigned to you');
      }
      if (!data.status) throw new BadRequestException('Status is required');
      const updated = await this.taskRepo.update(id, {
        status: data.status,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      });
      await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
      return updated;
    }

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = data;
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

    const updated = await this.taskRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
    return updated;
  }

  async deleteTask(id: string) {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    await this.eventService.emitHrEvent('deleted', { entity: 'task', id });
    return this.taskRepo.delete(id);
  }

  async updateTaskStatus(id: string, status: string) {
    if (!status) throw new BadRequestException('Status is required');

    const updated = await this.taskRepo.update(id, {
      status,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
    });
    await this.eventService.emitHrEvent('updated', { entity: 'task', data: updated });
    return updated;
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
      color: color || '#3B82F6',
      isActive: true,
    });
    await this.eventService.emitHrEvent('created', { entity: 'shift', data: shift });
    return shift;
  }

  async updateShift(id: string, data: Partial<{
    name: string;
    startTime: string;
    endTime: string;
    color: string;
    isActive: boolean;
  }>) {
    const existing = await this.shiftRepo.findById(id);
    if (!existing) throw new NotFoundException('Shift not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.shiftRepo.update(id, updateData);
    await this.eventService.emitHrEvent('updated', { entity: 'shift', data: updated });
    return updated;
  }

  async deleteShift(id: string) {
    const existing = await this.shiftRepo.findById(id);
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

    return this.shiftAssignmentRepo.findByOrganizationId(organizationId, processedFilters);
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

    const shift = await this.shiftRepo.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const existing = await this.shiftAssignmentRepo.findByShiftAndUserAndDate(shiftId, assignUserId, new Date(date));
    if (existing) throw new ConflictException('User already assigned to this shift on this date');

    const assignment = await this.shiftAssignmentRepo.create({
      organizationId,
      shiftId,
      userId: assignUserId,
      date: new Date(date),
      notes: notes || null,
    });
    await this.eventService.emitHrEvent('created', { entity: 'shiftAssignment', data: assignment });
    return assignment;
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

  async deleteShiftAssignment(id: string) {
    const existing = await this.shiftAssignmentRepo.findById(id);
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

  async updateLeaveType(id: string, data: Partial<{
    name: string;
    daysPerYear: number;
    isPaid: boolean;
    isActive: boolean;
  }>) {
    const existing = await this.leaveTypeRepo.findById(id);
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

  async deleteLeaveType(id: string) {
    const existing = await this.leaveTypeRepo.findById(id);
    if (!existing) throw new NotFoundException('Leave type not found');

    const requestCount = await this.leaveTypeRepo.countRequests(id);
    if (requestCount > 0) {
      throw new ConflictException('Cannot delete leave type with existing requests');
    }

    await this.eventService.emitHrEvent('deleted', { entity: 'leaveType', id });
    return this.leaveTypeRepo.delete(id);
  }

  // Leave Request operations
  async getLeaveRequests(organizationId: string, userRole: string, userId: string, filters?: {
    status?: string;
    userId?: string;
  }) {
    const processedFilters: any = {};
    if (filters?.status) processedFilters.status = filters.status;

    if (userRole === 'WORKER') {
      processedFilters.userId = userId;
    } else if (filters?.userId) {
      processedFilters.userId = filters.userId;
    }

    return this.leaveRequestRepo.findByOrganizationId(organizationId, processedFilters);
  }

  async createLeaveRequest(organizationId: string, userId: string, data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const { leaveTypeId, startDate, endDate, reason } = data;
    if (!leaveTypeId || !startDate || !endDate) {
      throw new BadRequestException('leaveTypeId, startDate, and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new BadRequestException('endDate must be after startDate');

    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) days++;
      current.setDate(current.getDate() + 1);
    }
    if (days === 0) throw new BadRequestException('Leave must include at least one business day');

    const year = start.getFullYear();
    const balance = await this.leaveBalanceRepo.findByUserAndTypeAndYear(userId, leaveTypeId, year);
    if (balance && (balance.usedDays + days) > balance.totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${balance.totalDays - balance.usedDays} days`);
    }

    const leaveRequest = await this.leaveRequestRepo.create({
      organizationId,
      userId,
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
    return leaveRequest;
  }

  async approveLeaveRequest(id: string, approverId: string, userRole: string) {
    if (!CAN_APPROVE_LEAVE_ROLES.includes(userRole)) {
      throw new ForbiddenException('Not authorized to approve leave');
    }

    const existing = await this.leaveRequestRepo.findById(id);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const updated = await this.leaveRequestRepo.update(id, {
      status: 'APPROVED',
      approvedById: approverId,
      approvedAt: new Date(),
    });

    const year = new Date(existing.startDate).getFullYear();
    await this.leaveBalanceRepo.upsert({
      organizationId: existing.organizationId,
      userId: existing.userId,
      leaveTypeId: existing.leaveTypeId,
      year,
      totalDays: 0,
      usedDays: existing.days,
    });

    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    return updated;
  }

  async rejectLeaveRequest(id: string, approverId: string, userRole: string, rejectionReason?: string) {
    if (!CAN_APPROVE_LEAVE_ROLES.includes(userRole)) {
      throw new ForbiddenException('Not authorized to reject leave');
    }

    const existing = await this.leaveRequestRepo.findById(id);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const updated = await this.leaveRequestRepo.update(id, {
      status: 'REJECTED',
      approvedById: approverId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || null,
    });

    await this.eventService.emitHrEvent('updated', { entity: 'leaveRequest', data: updated });
    return updated;
  }

  async cancelLeaveRequest(id: string, userId: string) {
    const existing = await this.leaveRequestRepo.findById(id);
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

  async createMessage(organizationId: string, senderId: string, senderName: string, data: {
    subject: string;
    body: string;
    recipientIds: string[];
    priority?: string;
  }) {
    const { subject, body: messageBody, recipientIds, priority } = data;
    if (!subject || !messageBody || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      throw new BadRequestException('subject, body, and recipientIds are required');
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
      recipientIds.map((recipientId) => ({
        messageId: message.id,
        recipientId,
        recipientName: '',
        organizationId,
      }))
    );

    await this.eventService.emitHrEvent('created', { entity: 'message', data: message });
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

  async getCorrespondenceById(id: string) {
    const item = await this.correspondenceRepo.findById(id);
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

  async updateCorrespondence(id: string, data: Partial<{
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
    const existing = await this.correspondenceRepo.findById(id);
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

  async archiveCorrespondence(id: string) {
    const existing = await this.correspondenceRepo.findById(id);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const updated = await this.correspondenceRepo.update(id, {
      archivedAt: new Date(),
      status: 'ARCHIVED',
    });
    await this.eventService.emitHrEvent('updated', { entity: 'correspondence', data: updated });
    return updated;
  }

  async unarchiveCorrespondence(id: string) {
    const existing = await this.correspondenceRepo.findById(id);
    if (!existing) throw new NotFoundException('Correspondence not found');

    const updated = await this.correspondenceRepo.update(id, {
      archivedAt: null,
      status: 'RECEIVED',
    });
    await this.eventService.emitHrEvent('updated', { entity: 'correspondence', data: updated });
    return updated;
  }

  async deleteCorrespondence(id: string) {
    const existing = await this.correspondenceRepo.findById(id);
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
    const existing = await this.correspondenceRepo.findById(correspondenceId);
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

  async getCorrespondenceAttachment(id: string) {
    const attachment = await this.correspondenceAttachmentRepo.findById(id);
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async deleteCorrespondenceAttachment(id: string) {
    const existing = await this.correspondenceAttachmentRepo.findById(id);
    if (!existing) throw new NotFoundException('Attachment not found');
    return this.correspondenceAttachmentRepo.delete(id);
  }
}
