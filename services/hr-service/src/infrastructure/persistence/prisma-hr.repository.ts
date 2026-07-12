import { Injectable } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';
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
import {
  Worker,
  Attendance,
  Task,
  Shift,
  ShiftAssignment,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  Message,
  MessageRecipient,
  Correspondence,
  CorrespondenceAttachment,
} from '../../domain/entities/hr.entity';

const prisma = scopedPrisma as any;

@Injectable()
export class PrismaWorkerRepository implements WorkerRepository {
  async findById(id: string): Promise<Worker | null> {
    return prisma.worker.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<Worker[]> {
    return prisma.worker.findMany({
      where: { organizationId },
      orderBy: { lastName: 'asc' },
    });
  }

  async create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<Worker> {
    return prisma.worker.create({ data });
  }

  async update(id: string, data: Partial<Worker>): Promise<Worker> {
    return prisma.worker.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.worker.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  async findById(id: string): Promise<Attendance | null> {
    return prisma.attendance.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string, filters?: {
    workerId?: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Attendance[]> {
    const where: any = { organizationId };
    if (filters?.workerId) where.workerId = filters.workerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      where.date = filters.date;
    } else if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    return prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { workerName: 'asc' }],
    });
  }

  async findByWorkerAndDate(organizationId: string, workerId: string, date: Date): Promise<Attendance | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return prisma.attendance.findFirst({
      where: {
        organizationId,
        workerId,
        date: { gte: start, lte: end },
      },
    });
  }

  async create(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Attendance> {
    return prisma.attendance.create({ data });
  }

  async update(id: string, data: Partial<Attendance>): Promise<Attendance> {
    return prisma.attendance.update({ where: { id }, data });
  }

  async createMany(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    const result = await prisma.attendance.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }
}

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    farmId?: string;
    search?: string;
  }): Promise<Task[]> {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.farmId) where.farmId = filters.farmId;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return prisma.task.create({ data });
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    return prisma.task.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  }

  async getStatusStats(organizationId: string): Promise<{ status: string; count: number }[]> {
    const stats = await prisma.task.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });
    return stats.map((s: any) => ({ status: s.status, count: s._count }));
  }
}

@Injectable()
export class PrismaShiftRepository implements ShiftRepository {
  async findById(id: string): Promise<Shift | null> {
    return prisma.shift.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<Shift[]> {
    return prisma.shift.findMany({
      where: { organizationId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findByName(organizationId: string, name: string): Promise<Shift | null> {
    return prisma.shift.findFirst({
      where: { name, organizationId },
    });
  }

  async create(data: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shift> {
    return prisma.shift.create({ data });
  }

  async update(id: string, data: Partial<Shift>): Promise<Shift> {
    return prisma.shift.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.shift.delete({ where: { id } });
  }

  async countAssignments(shiftId: string): Promise<number> {
    return prisma.shiftAssignment.count({ where: { shiftId } });
  }
}

@Injectable()
export class PrismaShiftAssignmentRepository implements ShiftAssignmentRepository {
  async findById(id: string): Promise<ShiftAssignment | null> {
    return prisma.shiftAssignment.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<ShiftAssignment[]> {
    const where: any = { organizationId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    return prisma.shiftAssignment.findMany({
      where,
      include: { shift: true },
      orderBy: { date: 'asc' },
    });
  }

  async findByShiftAndUserAndDate(shiftId: string, userId: string, date: Date): Promise<ShiftAssignment | null> {
    return prisma.shiftAssignment.findFirst({
      where: { shiftId, userId, date },
    });
  }

  async create(data: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShiftAssignment> {
    return prisma.shiftAssignment.create({
      data,
      include: { shift: true },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.shiftAssignment.delete({ where: { id } });
  }

  async createMany(data: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    const result = await prisma.shiftAssignment.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }
}

@Injectable()
export class PrismaLeaveTypeRepository implements LeaveTypeRepository {
  async findById(id: string): Promise<LeaveType | null> {
    return prisma.leaveType.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<LeaveType[]> {
    return prisma.leaveType.findMany({
      where: { organizationId },
      include: { _count: { select: { leaveRequests: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findByName(organizationId: string, name: string): Promise<LeaveType | null> {
    return prisma.leaveType.findFirst({
      where: { name, organizationId },
    });
  }

  async create(data: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType> {
    return prisma.leaveType.create({ data });
  }

  async update(id: string, data: Partial<LeaveType>): Promise<LeaveType> {
    return prisma.leaveType.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.leaveType.delete({ where: { id } });
  }

  async countRequests(leaveTypeId: string): Promise<number> {
    return prisma.leaveRequest.count({ where: { leaveTypeId } });
  }
}

@Injectable()
export class PrismaLeaveRequestRepository implements LeaveRequestRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    return prisma.leaveRequest.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    userId?: string;
  }): Promise<LeaveRequest[]> {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;

    return prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { name: true, isPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    return prisma.leaveRequest.create({
      data,
      include: { leaveType: { select: { name: true } } },
    });
  }

  async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    return prisma.leaveRequest.update({
      where: { id },
      data,
      include: { leaveType: { select: { name: true } } },
    });
  }
}

@Injectable()
export class PrismaLeaveBalanceRepository implements LeaveBalanceRepository {
  async findByUserAndTypeAndYear(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    return prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
  }

  async findByOrganizationAndUser(organizationId: string, userId: string, year: number): Promise<LeaveBalance[]> {
    return prisma.leaveBalance.findMany({
      where: { organizationId, userId, year },
      include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
    });
  }

  async upsert(data: {
    organizationId: string;
    userId: string;
    leaveTypeId: string;
    year: number;
    totalDays: number;
    usedDays?: number;
  }): Promise<LeaveBalance> {
    return prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: data.userId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      create: {
        organizationId: data.organizationId,
        userId: data.userId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        totalDays: data.totalDays,
        usedDays: data.usedDays || 0,
      },
      update: {
        totalDays: data.totalDays,
        ...(data.usedDays !== undefined ? { usedDays: { increment: data.usedDays } } : {}),
      },
    });
  }
}

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  async findById(id: string, organizationId: string): Promise<Message | null> {
    return prisma.message.findFirst({
      where: { id, organizationId },
      include: { recipients: true },
    });
  }

  async findSentByUser(userId: string, organizationId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { senderId: userId, organizationId },
      include: { recipients: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    return prisma.message.create({ data });
  }

  async delete(id: string): Promise<void> {
    await prisma.message.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaMessageRecipientRepository implements MessageRecipientRepository {
  async findByRecipient(recipientId: string, organizationId: string): Promise<(MessageRecipient & { message: Message })[]> {
    const recipients = await prisma.messageRecipient.findMany({
      where: { recipientId, organizationId },
      include: { message: true },
      orderBy: { createdAt: 'desc' },
    });

    return recipients.map((r: any) => ({
      ...r.message,
      recipientId: r.id,
      isRead: r.isRead,
      readAt: r.readAt,
    })) as any;
  }

  async findByMessageAndRecipient(messageId: string, recipientId: string): Promise<MessageRecipient | null> {
    return prisma.messageRecipient.findFirst({
      where: { messageId, recipientId },
    });
  }

  async markAsRead(id: string): Promise<void> {
    await prisma.messageRecipient.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.messageRecipient.delete({ where: { id } });
  }

  async createMany(data: Omit<MessageRecipient, 'id' | 'createdAt' | 'updatedAt' | 'isRead' | 'readAt'>[]): Promise<void> {
    await prisma.messageRecipient.createMany({
      data: data.map((d) => ({
        ...d,
        isRead: false,
        readAt: null,
      })),
    });
  }

  async countUnread(recipientId: string, organizationId: string): Promise<number> {
    return prisma.messageRecipient.count({
      where: { recipientId, organizationId, isRead: false },
    });
  }
}

@Injectable()
export class PrismaCorrespondenceRepository implements CorrespondenceRepository {
  async findById(id: string): Promise<Correspondence | null> {
    return prisma.correspondence.findFirst({
      where: { id },
      include: { attachments: true },
    });
  }

  async findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    type?: string;
    category?: string;
    archived?: boolean;
  }): Promise<Correspondence[]> {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.archived === true) where.archivedAt = { not: null };
    else if (filters?.archived === false) where.archivedAt = null;

    return prisma.correspondence.findMany({
      where,
      include: { attachments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByOrganizationAndYear(organizationId: string, year: number): Promise<number> {
    return prisma.correspondence.count({
      where: {
        organizationId,
        referenceNumber: { startsWith: `COR-${year}-` },
      },
    });
  }

  async create(data: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Correspondence> {
    return prisma.correspondence.create({ data });
  }

  async update(id: string, data: Partial<Correspondence>): Promise<Correspondence> {
    return prisma.correspondence.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.correspondence.delete({ where: { id } });
  }

  async getStats(organizationId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    received: number;
    archived: number;
  }> {
    const [total, draft, sent, received, archived] = await Promise.all([
      prisma.correspondence.count({ where: { organizationId } }),
      prisma.correspondence.count({ where: { organizationId, status: 'DRAFT' } }),
      prisma.correspondence.count({ where: { organizationId, status: 'SENT' } }),
      prisma.correspondence.count({ where: { organizationId, status: 'RECEIVED' } }),
      prisma.correspondence.count({ where: { organizationId, archivedAt: { not: null } } }),
    ]);
    return { total, draft, sent, received, archived };
  }
}

@Injectable()
export class PrismaCorrespondenceAttachmentRepository implements CorrespondenceAttachmentRepository {
  async findById(id: string): Promise<CorrespondenceAttachment | null> {
    return prisma.correspondenceAttachment.findFirst({ where: { id } });
  }

  async create(data: Omit<CorrespondenceAttachment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrespondenceAttachment> {
    return prisma.correspondenceAttachment.create({ data });
  }

  async delete(id: string): Promise<void> {
    await prisma.correspondenceAttachment.delete({ where: { id } });
  }
}
