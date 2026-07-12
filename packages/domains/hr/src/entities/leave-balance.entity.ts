import { BaseEntity, Id } from '@farm/domain-core';

interface LeaveBalanceProps {
  organizationId: Id;
  userId: Id;
  leaveTypeId: Id;
  year: number;
  totalDays: number;
  usedDays: number;
}

export class LeaveBalance extends BaseEntity<LeaveBalanceProps> {
  private constructor(id: Id, props: LeaveBalanceProps) {
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

  get year(): number {
    return this.props.year;
  }

  get totalDays(): number {
    return this.props.totalDays;
  }

  get usedDays(): number {
    return this.props.usedDays;
  }

  get remainingDays(): number {
    return this.props.totalDays - this.props.usedDays;
  }

  static create(
    id: Id,
    organizationId: Id,
    userId: Id,
    leaveTypeId: Id,
    year: number,
    totalDays: number,
  ): LeaveBalance {
    return new LeaveBalance(id, { organizationId, userId, leaveTypeId, year, totalDays, usedDays: 0 });
  }

  use(days: number): void {
    if (this.props.usedDays + days > this.props.totalDays) {
      throw new Error('Insufficient leave balance');
    }
    this.props.usedDays += days;
  }
}
