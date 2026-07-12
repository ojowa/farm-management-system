import { BaseDomainEvent } from '@farm/domain-core';

export class CropCreated extends BaseDomainEvent {
  readonly eventName = 'CropCreated';
}

export class CropUpdated extends BaseDomainEvent {
  readonly eventName = 'CropUpdated';
}

export class CropDeleted extends BaseDomainEvent {
  readonly eventName = 'CropDeleted';
}

export class CropPlanted extends BaseDomainEvent {
  readonly eventName = 'CropPlanted';
}

export class CropHarvested extends BaseDomainEvent {
  readonly eventName = 'CropHarvested';
}

export class IrrigationScheduled extends BaseDomainEvent {
  readonly eventName = 'IrrigationScheduled';
}

export class PestIdentified extends BaseDomainEvent {
  readonly eventName = 'PestIdentified';
}

export class YieldRecorded extends BaseDomainEvent {
  readonly eventName = 'YieldRecorded';
}
