import { BaseDomainEvent } from '@farm/domain-core';

export class LivestockCreated extends BaseDomainEvent {
  readonly eventName = 'LivestockCreated';
}

export class LivestockUpdated extends BaseDomainEvent {
  readonly eventName = 'LivestockUpdated';
}

export class LivestockDeleted extends BaseDomainEvent {
  readonly eventName = 'LivestockDeleted';
}

export class HealthRecorded extends BaseDomainEvent {
  readonly eventName = 'HealthRecorded';
}

export class VaccinationScheduled extends BaseDomainEvent {
  readonly eventName = 'VaccinationScheduled';
}

export class VaccinationAdministered extends BaseDomainEvent {
  readonly eventName = 'VaccinationAdministered';
}

export class BreedingRecorded extends BaseDomainEvent {
  readonly eventName = 'BreedingRecorded';
}

export class BreedingBorn extends BaseDomainEvent {
  readonly eventName = 'BreedingBorn';
}

export class WeightRecorded extends BaseDomainEvent {
  readonly eventName = 'WeightRecorded';
}
