import { AggregateRoot, Id } from '@farm/domain-core';
import { AttendanceStatus } from '../value-objects/attendance-status.value-object';

interface AttendanceProps {
  organizationId: Id;
  workerId: Id;
  workerName: string;
  date: Date;
  status: AttendanceStatus;
  clockInTime?: Date;
  clockOutTime?: Date;
  hoursWorked?: number;
  notes?: string;
}

export class Attendance extends AggregateRoot<AttendanceProps> {
  private constructor(id: Id, props: AttendanceProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get workerId(): Id {
    return this.props.workerId;
  }

  get workerName(): string {
    return this.props.workerName;
  }

  get date(): Date {
    return this.props.date;
  }

  get status(): AttendanceStatus {
    return this.props.status;
  }

  get clockInTime(): Date | undefined {
    return this.props.clockInTime;
  }

  get clockOutTime(): Date | undefined {
    return this.props.clockOutTime;
  }

  get hoursWorked(): number | undefined {
    return this.props.hoursWorked;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    workerId: Id,
    workerName: string,
    date: Date,
    status: AttendanceStatus,
    notes?: string,
  ): Attendance {
    return new Attendance(id, { organizationId, workerId, workerName, date, status, notes });
  }

  clockIn(time: Date = new Date()): void {
    this.props.clockInTime = time;

    const hours = time.getHours();
    const minutes = time.getMinutes();
    if (hours > 9 || (hours === 9 && minutes > 0)) {
      this.props.status = AttendanceStatus.LATE;
    } else {
      this.props.status = AttendanceStatus.PRESENT;
    }
  }

  clockOut(time: Date = new Date()): void {
    this.props.clockOutTime = time;

    if (this.props.clockInTime) {
      const diffMs = time.getTime() - this.props.clockInTime.getTime();
      this.props.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
  }
}
