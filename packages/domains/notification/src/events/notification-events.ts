import { BaseDomainEvent } from '@farm/domain-core';

export class NotificationCreated extends BaseDomainEvent {
  readonly eventName = 'NotificationCreated';
}

export class NotificationRead extends BaseDomainEvent {
  readonly eventName = 'NotificationRead';
}

export class NotificationAllRead extends BaseDomainEvent {
  readonly eventName = 'NotificationAllRead';
}
