import { BaseEntity, Id } from '@farm/domain-core';

interface ShiftAssignmentProps {
  organizationId: Id;
  shiftId: Id;
  userId: Id;
  date: Date;
  notes?: string;
}

export class ShiftAssignment extends BaseEntity<ShiftAssignmentProps> {
  private constructor(id: Id, props: ShiftAssignmentProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get shiftId(): Id {
    return this.props.shiftId;
  }

  get userId(): Id {
    return this.props.userId;
  }

  get date(): Date {
    return this.props.date;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    shiftId: Id,
    userId: Id,
    date: Date,
    notes?: string,
  ): ShiftAssignment {
    return new ShiftAssignment(id, { organizationId, shiftId, userId, date, notes });
  }
}
