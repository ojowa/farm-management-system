import { Crop, CropCycle } from '../entities/crop.entity';

export interface CropCreatedEvent {
  type: 'crop.created';
  payload: Crop;
}

export interface CropUpdatedEvent {
  type: 'crop.updated';
  payload: Crop;
}

export interface CropDeletedEvent {
  type: 'crop.deleted';
  payload: { id: string };
}

export interface CropCycleCreatedEvent {
  type: 'crop-cycle.created';
  payload: CropCycle;
}

export interface CropCycleUpdatedEvent {
  type: 'crop-cycle.updated';
  payload: CropCycle;
}

export interface CropCycleDeletedEvent {
  type: 'crop-cycle.deleted';
  payload: { id: string };
}

export type CropDomainEvent =
  | CropCreatedEvent
  | CropUpdatedEvent
  | CropDeletedEvent
  | CropCycleCreatedEvent
  | CropCycleUpdatedEvent
  | CropCycleDeletedEvent;
