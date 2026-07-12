import { BaseDomainEvent } from '@farm/domain-core';

export class WorkerCreated extends BaseDomainEvent {
  readonly eventName = 'WorkerCreated';
}

export class WorkerUpdated extends BaseDomainEvent {
  readonly eventName = 'WorkerUpdated';
}

export class AttendanceRecorded extends BaseDomainEvent {
  readonly eventName = 'AttendanceRecorded';
}

export class ClockInRecorded extends BaseDomainEvent {
  readonly eventName = 'ClockInRecorded';
}

export class ClockOutRecorded extends BaseDomainEvent {
  readonly eventName = 'ClockOutRecorded';
}

export class TaskCreated extends BaseDomainEvent {
  readonly eventName = 'TaskCreated';
}

export class TaskAssigned extends BaseDomainEvent {
  readonly eventName = 'TaskAssigned';
}

export class TaskCompleted extends BaseDomainEvent {
  readonly eventName = 'TaskCompleted';
}

export class TaskStatusUpdated extends BaseDomainEvent {
  readonly eventName = 'TaskStatusUpdated';
}

export class ShiftCreated extends BaseDomainEvent {
  readonly eventName = 'ShiftCreated';
}

export class ShiftUpdated extends BaseDomainEvent {
  readonly eventName = 'ShiftUpdated';
}

export class ShiftDeactivated extends BaseDomainEvent {
  readonly eventName = 'ShiftDeactivated';
}

export class ShiftAssignmentCreated extends BaseDomainEvent {
  readonly eventName = 'ShiftAssignmentCreated';
}

export class LeaveTypeCreated extends BaseDomainEvent {
  readonly eventName = 'LeaveTypeCreated';
}

export class LeaveTypeUpdated extends BaseDomainEvent {
  readonly eventName = 'LeaveTypeUpdated';
}

export class LeaveRequestCreated extends BaseDomainEvent {
  readonly eventName = 'LeaveRequestCreated';
}

export class LeaveRequestApproved extends BaseDomainEvent {
  readonly eventName = 'LeaveRequestApproved';
}

export class LeaveRequestRejected extends BaseDomainEvent {
  readonly eventName = 'LeaveRequestRejected';
}

export class LeaveRequestCancelled extends BaseDomainEvent {
  readonly eventName = 'LeaveRequestCancelled';
}

export class LeaveBalanceCreated extends BaseDomainEvent {
  readonly eventName = 'LeaveBalanceCreated';
}

export class LeaveBalanceUsed extends BaseDomainEvent {
  readonly eventName = 'LeaveBalanceUsed';
}

export class MessageCreated extends BaseDomainEvent {
  readonly eventName = 'MessageCreated';
}

export class CorrespondenceCreated extends BaseDomainEvent {
  readonly eventName = 'CorrespondenceCreated';
}

export class CorrespondenceArchived extends BaseDomainEvent {
  readonly eventName = 'CorrespondenceArchived';
}

export class CorrespondenceUnarchived extends BaseDomainEvent {
  readonly eventName = 'CorrespondenceUnarchived';
}
