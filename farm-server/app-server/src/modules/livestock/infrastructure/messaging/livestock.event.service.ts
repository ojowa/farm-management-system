import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Livestock } from '../../domain/entities/livestock.entity';

@Injectable()
export class LivestockEventService {
  constructor(private readonly events: EventBus) {}

  // S4: every event carries the owning organizationId so realtime/websocket
  // fan-out never crosses tenant boundaries (delete events used to omit it).

  emitLivestockCreatedEvent(livestock: Livestock) {
    this.events.emitDomainEvent('livestock', 'created', livestock, livestock.organizationId);
  }

  emitLivestockUpdatedEvent(livestock: Livestock) {
    this.events.emitDomainEvent('livestock', 'updated', livestock, livestock.organizationId);
  }

  emitLivestockDeletedEvent(livestockId: string, organizationId?: string) {
    this.events.emitDomainEvent('livestock', 'deleted', { id: livestockId }, organizationId);
  }
}
