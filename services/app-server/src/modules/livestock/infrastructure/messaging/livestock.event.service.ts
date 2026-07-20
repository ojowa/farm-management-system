import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Livestock } from '../../domain/entities/livestock.entity';

@Injectable()
export class LivestockEventService {
  constructor(private readonly events: EventBus) {}

  emitLivestockCreatedEvent(livestock: Livestock) {
    this.events.emitDomainEvent('livestock', 'created', livestock);
  }

  emitLivestockUpdatedEvent(livestock: Livestock) {
    this.events.emitDomainEvent('livestock', 'updated', livestock);
  }

  emitLivestockDeletedEvent(livestockId: string) {
    this.events.emitDomainEvent('livestock', 'deleted', { id: livestockId });
  }
}
