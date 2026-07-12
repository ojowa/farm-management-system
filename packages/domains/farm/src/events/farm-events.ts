import { BaseDomainEvent } from '@farm/domain-core';

export class FarmCreated extends BaseDomainEvent {
  readonly eventName = 'FarmCreated';
}

export class FarmUpdated extends BaseDomainEvent {
  readonly eventName = 'FarmUpdated';
}

export class FarmDeleted extends BaseDomainEvent {
  readonly eventName = 'FarmDeleted';
}

export class FieldCreated extends BaseDomainEvent {
  readonly eventName = 'FieldCreated';
}

export class FieldUpdated extends BaseDomainEvent {
  readonly eventName = 'FieldUpdated';
}

export class FieldDeleted extends BaseDomainEvent {
  readonly eventName = 'FieldDeleted';
}
