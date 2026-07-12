import { AggregateRoot, Id } from '@farm/domain-core';
import { TaskPriority } from '../value-objects/task-priority.value-object';
import { TaskStatus } from '../value-objects/task-status.value-object';

interface TaskProps {
  organizationId: Id;
  farmId: Id;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToId?: Id;
  assignedToName?: string;
  createdById: Id;
  createdByName: string;
  dueDate?: Date;
  completedAt?: Date;
}

export class Task extends AggregateRoot<TaskProps> {
  private constructor(id: Id, props: TaskProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get priority(): TaskPriority {
    return this.props.priority;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get assignedToId(): Id | undefined {
    return this.props.assignedToId;
  }

  get assignedToName(): string | undefined {
    return this.props.assignedToName;
  }

  get createdById(): Id {
    return this.props.createdById;
  }

  get createdByName(): string {
    return this.props.createdByName;
  }

  get dueDate(): Date | undefined {
    return this.props.dueDate;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  static create(
    id: Id,
    organizationId: Id,
    farmId: Id,
    title: string,
    description: string,
    priority: TaskPriority,
    createdById: Id,
    createdByName: string,
    dueDate?: Date,
  ): Task {
    return new Task(id, {
      organizationId,
      farmId,
      title,
      description,
      priority,
      status: TaskStatus.PENDING,
      createdById,
      createdByName,
      dueDate,
    });
  }

  assign(assigneeId: Id, assigneeName: string): void {
    this.props.assignedToId = assigneeId;
    this.props.assignedToName = assigneeName;
    this.props.status = TaskStatus.IN_PROGRESS;
  }

  complete(): void {
    this.props.status = TaskStatus.COMPLETED;
    this.props.completedAt = new Date();
  }

  updateStatus(status: TaskStatus): void {
    this.props.status = status;
  }
}
