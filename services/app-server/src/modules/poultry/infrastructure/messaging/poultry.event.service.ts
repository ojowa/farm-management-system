import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';

@Injectable()
export class PoultryEventService {
  constructor(private readonly events: EventBus) {}

  emitCreated(entityType: string, data: Record<string, unknown>) {
    this.events.emitDomainEvent('poultry', 'created', { entityType, ...data });
  }

  emitUpdated(entityType: string, data: Record<string, unknown>) {
    this.events.emitDomainEvent('poultry', 'updated', { entityType, ...data });
  }

  emitDeleted(entityType: string, id: string) {
    this.events.emitDomainEvent('poultry', 'deleted', { entityType, id });
  }
}
