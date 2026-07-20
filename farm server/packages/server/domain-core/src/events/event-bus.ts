import { DomainEvent } from './domain-event';
import { EventHandler } from './event-handler';

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
  unsubscribe(eventName: string, handler: EventHandler): void;
}
