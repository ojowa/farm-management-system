import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Farm } from '../../domain/entities/farm.entity';

@Injectable()
export class FarmEventService {
  constructor(private readonly events: EventBus) {}

  emitFarmCreatedEvent(farm: Farm) {
    this.events.emitDomainEvent('farm', 'created', farm);
  }

  emitFarmUpdatedEvent(farm: Farm) {
    this.events.emitDomainEvent('farm', 'updated', farm);
  }

  emitFarmDeletedEvent(farmId: string) {
    this.events.emitDomainEvent('farm', 'deleted', { id: farmId });
  }
}
