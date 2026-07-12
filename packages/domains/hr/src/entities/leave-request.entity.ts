import { AggregateRoot, Id } from '@farm/domain-core';
import { LeaveStatus } from '../value-objects/leave-status.value-object';

interface LeaveRequestProps {
  organizationId: Id;
  userId: Id;
  leaveTypeId: Id;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedById?: Id;
  approvedAt?: Date;
  rejectionReason?: string;
}

export class LeaveRequest extends AggregateRoot<LeaveRequestProps> {
  private constructor(id: Id, props: LeaveRequestProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get userId(): Id {
    return this.props.userId;
  }

  get leaveTypeId(): Id {
    return this.props.leaveTypeId;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get days(): number {
    return this.props.days;
  }

  get reason(): string {
    return this.props.reason;
  }

  get status(): LeaveStatus {
    return this.props.status;
  }

  get approvedById(): Id | undefined {
    return this.props.approvedById;
  }

  get approvedAt(): Date | undefined {
    return this.props.approvedAt;
  }

  get rejectionReason(): string | undefined {
    return this.props.rejectionReason;
  }

  static calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  static create(
    id: Id,
    organizationId: Id,
    userId: Id,
    leaveTypeId: Id,
    startDate: Date,
    endDate: Date,
    reason: string,
  ): LeaveRequest {
    const days = LeaveRequest.calculateBusinessDays(startDate, endDate);
    return new LeaveRequest(id, {
      organizationId,
      userId,
      leaveTypeId,
      startDate,
      endDate,
      days,
      reason,
      status: LeaveStatus.PENDING,
    });
  }

  approve(approverId: Id): void {
    this.props.status = LeaveStatus.APPROVED;
    this.props.approvedById = approverId;
    this.props.approvedAt = new Date();
  }

  reject(rejectionReason: string): void {
    this.props.status = LeaveStatus.REJECTED;
    this.props.rejectionReason = rejectionReason;
  }

  cancel(): void {
    this.props.status = LeaveStatus.CANCELLED;
  }
}
