import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime';
import { Farm } from '../../domain/entities/farm.entity';

@Injectable()
export class FarmEventService {
  constructor(private readonly events: EventBus) {}

  emitFarmCreatedEvent(farm: Farm) {
    this.events.emitDomainEvent('farm', 'created', farm, farm.organizationId);
  }

  emitFarmUpdatedEvent(farm: Farm) {
    this.events.emitDomainEvent('farm', 'updated', farm, farm.organizationId);
  }

  emitFarmDeletedEvent(farmId: string, organizationId?: string) {
    this.events.emitDomainEvent('farm', 'deleted', { id: farmId }, organizationId);
  }
}
