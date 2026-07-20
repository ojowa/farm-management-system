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
} from '../entities/hr.entity';

export interface WorkerRepository {
  findById(id: string): Promise<Worker | null>;
  findByOrganizationId(organizationId: string): Promise<Worker[]>;
  create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<Worker>;
  update(id: string, data: Partial<Worker>): Promise<Worker>;
  delete(id: string): Promise<void>;
}

export interface AttendanceRepository {
  findById(id: string): Promise<Attendance | null>;
  findByOrganizationId(organizationId: string, filters?: {
    workerId?: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Attendance[]>;
  findByWorkerAndDate(organizationId: string, workerId: string, date: Date): Promise<Attendance | null>;
  create(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Attendance>;
  update(id: string, data: Partial<Attendance>): Promise<Attendance>;
  createMany(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    farmId?: string;
    search?: string;
  }): Promise<Task[]>;
  create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  getStatusStats(organizationId: string): Promise<{ status: string; count: number }[]>;
}

export interface ShiftRepository {
  findById(id: string): Promise<Shift | null>;
  findByOrganizationId(organizationId: string): Promise<Shift[]>;
  findByName(organizationId: string, name: string): Promise<Shift | null>;
  create(data: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shift>;
  update(id: string, data: Partial<Shift>): Promise<Shift>;
  delete(id: string): Promise<void>;
  countAssignments(shiftId: string): Promise<number>;
}

export interface ShiftAssignmentRepository {
  findById(id: string): Promise<ShiftAssignment | null>;
  findByOrganizationId(organizationId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<ShiftAssignment[]>;
  findByShiftAndUserAndDate(shiftId: string, userId: string, date: Date): Promise<ShiftAssignment | null>;
  create(data: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShiftAssignment>;
  delete(id: string): Promise<void>;
  createMany(data: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>;
}

export interface LeaveTypeRepository {
  findById(id: string): Promise<LeaveType | null>;
  findByOrganizationId(organizationId: string): Promise<LeaveType[]>;
  findByName(organizationId: string, name: string): Promise<LeaveType | null>;
  create(data: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType>;
  update(id: string, data: Partial<LeaveType>): Promise<LeaveType>;
  delete(id: string): Promise<void>;
  countRequests(leaveTypeId: string): Promise<number>;
}

export interface LeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    userId?: string;
  }): Promise<LeaveRequest[]>;
  create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest>;
}

export interface LeaveBalanceRepository {
  findByUserAndTypeAndYear(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  findByOrganizationAndUser(organizationId: string, userId: string, year: number): Promise<LeaveBalance[]>;
  upsert(data: {
    organizationId: string;
    userId: string;
    leaveTypeId: string;
    year: number;
    totalDays: number;
    usedDays?: number;
  }): Promise<LeaveBalance>;
}

export interface MessageRepository {
  findById(id: string, organizationId: string): Promise<Message | null>;
  findSentByUser(userId: string, organizationId: string): Promise<Message[]>;
  create(data: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message>;
  delete(id: string): Promise<void>;
}

export interface MessageRecipientRepository {
  findByRecipient(recipientId: string, organizationId: string): Promise<(MessageRecipient & { message: Message })[]>;
  findByMessageAndRecipient(messageId: string, recipientId: string): Promise<MessageRecipient | null>;
  markAsRead(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  createMany(data: Omit<MessageRecipient, 'id' | 'createdAt' | 'updatedAt' | 'isRead' | 'readAt'>[]): Promise<void>;
  countUnread(recipientId: string, organizationId: string): Promise<number>;
}

export interface CorrespondenceRepository {
  findById(id: string): Promise<Correspondence | null>;
  findByOrganizationId(organizationId: string, filters?: {
    status?: string;
    type?: string;
    category?: string;
    archived?: boolean;
  }): Promise<Correspondence[]>;
  countByOrganizationAndYear(organizationId: string, year: number): Promise<number>;
  create(data: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Correspondence>;
  update(id: string, data: Partial<Correspondence>): Promise<Correspondence>;
  delete(id: string): Promise<void>;
  getStats(organizationId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    received: number;
    archived: number;
  }>;
}

export interface CorrespondenceAttachmentRepository {
  findById(id: string): Promise<CorrespondenceAttachment | null>;
  create(data: Omit<CorrespondenceAttachment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrespondenceAttachment>;
  delete(id: string): Promise<void>;
}
