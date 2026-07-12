import { BaseEntity, Id } from '@farm/domain-core';
import { FieldCreated, FieldUpdated, FieldDeleted } from '../events/farm-events';

export interface FieldProps {
  farmId: string;
  name: string;
  size: number;
}

export class Field extends BaseEntity<FieldProps> {
  private _domainEvents: Array<{ eventName: string; aggregateId: string; data?: Record<string, unknown>; occurredOn: Date }> = [];

  private constructor(id: Id, props: FieldProps) {
    super(id, props);
  }

  get farmId(): string {
    return this.props.farmId;
  }

  get name(): string {
    return this.props.name;
  }

  get size(): number {
    return this.props.size;
  }

  get domainEvents(): ReadonlyArray<{ eventName: string; aggregateId: string; data?: Record<string, unknown>; occurredOn: Date }> {
    return this._domainEvents;
  }

  static create(props: FieldProps): Field {
    const id = Id.create();
    const field = new Field(id, props);
    field._domainEvents.push(new FieldCreated(id.toString(), { ...props }));
    return field;
  }

  update(props: Partial<Omit<FieldProps, 'farmId'>>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.size !== undefined) this.props.size = props.size;
    this._domainEvents.push(new FieldUpdated(this.id.toString(), { ...props }));
  }

  delete(): void {
    this._domainEvents.push(new FieldDeleted(this.id.toString()));
  }
}
