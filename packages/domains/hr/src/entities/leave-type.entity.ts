import { BaseEntity, Id } from '@farm/domain-core';

interface LeaveTypeProps {
  organizationId: Id;
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  isActive: boolean;
}

export class LeaveType extends BaseEntity<LeaveTypeProps> {
  private constructor(id: Id, props: LeaveTypeProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get daysPerYear(): number {
    return this.props.daysPerYear;
  }

  get isPaid(): boolean {
    return this.props.isPaid;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  static create(
    id: Id,
    organizationId: Id,
    name: string,
    daysPerYear: number,
    isPaid: boolean,
  ): LeaveType {
    return new LeaveType(id, { organizationId, name, daysPerYear, isPaid, isActive: true });
  }

  update(name: string, daysPerYear: number, isPaid: boolean): void {
    this.props.name = name;
    this.props.daysPerYear = daysPerYear;
    this.props.isPaid = isPaid;
  }
}
