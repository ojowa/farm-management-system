export interface Worker {
  id: string;
  organizationId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  department: string | null;
  hireDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  organizationId: string;
  workerId: string;
  workerName: string;
  date: Date;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdById: string | null;
  createdByName: string | null;
  farmId: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  organizationId: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftAssignment {
  id: string;
  organizationId: string;
  shiftId: string;
  userId: string;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  userId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string | null;
  status: string;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: string;
  organizationId: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecipient {
  id: string;
  messageId: string;
  recipientId: string;
  recipientName: string;
  organizationId: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Correspondence {
  id: string;
  organizationId: string;
  referenceNumber: string;
  title: string;
  type: string;
  category: string;
  from: string | null;
  to: string | null;
  content: string | null;
  status: string;
  priority: string;
  receivedDate: Date | null;
  createdById: string;
  createdByName: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorrespondenceAttachment {
  id: string;
  correspondenceId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  fileType: string | null;
  uploadedById: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}
