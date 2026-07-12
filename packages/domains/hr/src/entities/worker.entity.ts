import { AggregateRoot, Id } from '@farm/domain-core';

interface WorkerProps {
  farmId: Id;
  name: string;
  role: string;
}

export class Worker extends AggregateRoot<WorkerProps> {
  private constructor(id: Id, props: WorkerProps) {
    super(id, props);
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): string {
    return this.props.role;
  }

  static create(id: Id, farmId: Id, name: string, role: string): Worker {
    return new Worker(id, { farmId, name, role });
  }

  update(name: string, role: string): void {
    this.props.name = name;
    this.props.role = role;
  }
}
