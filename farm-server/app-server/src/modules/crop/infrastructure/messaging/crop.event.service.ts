import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Crop, CropCycle } from '../../domain/entities/crop.entity';

@Injectable()
export class CropEventService {
  constructor(private readonly events: EventBus) {}

  // S4: every event carries the owning organizationId so realtime/websocket
  // fan-out never crosses tenant boundaries (delete events used to omit it,
  // broadcasting deletions to every connected client).

  emitCropCreatedEvent(crop: Crop) {
    this.events.emitDomainEvent('crop', 'created', crop, crop.organizationId);
  }

  emitCropUpdatedEvent(crop: Crop) {
    this.events.emitDomainEvent('crop', 'updated', crop, crop.organizationId);
  }

  emitCropDeletedEvent(cropId: string, organizationId?: string) {
    this.events.emitDomainEvent('crop', 'deleted', { id: cropId }, organizationId);
  }

  emitCropCycleCreatedEvent(cycle: CropCycle) {
    this.events.emitDomainEvent('crop', 'created', cycle, cycle.organizationId);
  }

  emitCropCycleUpdatedEvent(cycle: CropCycle) {
    this.events.emitDomainEvent('crop', 'updated', cycle, cycle.organizationId);
  }

  emitCropCycleDeletedEvent(cycleId: string, organizationId?: string) {
    this.events.emitDomainEvent('crop', 'deleted', { id: cycleId, cycleId }, organizationId);
  }
}
