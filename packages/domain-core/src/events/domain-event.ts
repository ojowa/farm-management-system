export interface DomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly data?: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  abstract readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly data?: Record<string, unknown>;

  constructor(aggregateId: string, data?: Record<string, unknown>) {
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.data = data;
  }
}
