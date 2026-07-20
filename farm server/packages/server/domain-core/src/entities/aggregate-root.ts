import { BaseEntity } from './base.entity';
import { Id } from '../value-objects/id.value-object';
import { DomainEvent } from '../events/domain-event';

export abstract class AggregateRoot<T> extends BaseEntity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
