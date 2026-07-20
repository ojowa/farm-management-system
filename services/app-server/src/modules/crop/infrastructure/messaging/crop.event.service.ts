import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Crop, CropCycle } from '../../domain/entities/crop.entity';

@Injectable()
export class CropEventService {
  constructor(private readonly events: EventBus) {}

  emitCropCreatedEvent(crop: Crop) {
    this.events.emitDomainEvent('crop', 'created', crop);
  }

  emitCropUpdatedEvent(crop: Crop) {
    this.events.emitDomainEvent('crop', 'updated', crop);
  }

  emitCropDeletedEvent(cropId: string) {
    this.events.emitDomainEvent('crop', 'deleted', { id: cropId });
  }

  emitCropCycleCreatedEvent(cycle: CropCycle) {
    this.events.emitDomainEvent('crop', 'created', cycle);
  }

  emitCropCycleUpdatedEvent(cycle: CropCycle) {
    this.events.emitDomainEvent('crop', 'updated', cycle);
  }

  emitCropCycleDeletedEvent(cycleId: string) {
    this.events.emitDomainEvent('crop', 'deleted', { id: cycleId });
  }
}
