import { AggregateRoot, Id } from '@farm/domain-core';

export enum CropCycleStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CropHealth {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}

interface CropCycleProps {
  fieldId: Id;
  cropId: Id;
  organizationId: Id;
  plantingDate: Date;
  harvestDate?: Date;
  health: CropHealth;
  status: CropCycleStatus;
}

export class CropCycle extends AggregateRoot<CropCycleProps> {
  private constructor(id: Id, props: CropCycleProps) {
    super(id, props);
  }

  get fieldId(): Id {
    return this.props.fieldId;
  }

  get cropId(): Id {
    return this.props.cropId;
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get plantingDate(): Date {
    return this.props.plantingDate;
  }

  get harvestDate(): Date | undefined {
    return this.props.harvestDate;
  }

  get health(): CropHealth {
    return this.props.health;
  }

  get status(): CropCycleStatus {
    return this.props.status;
  }

  static create(
    id: Id,
    fieldId: Id,
    cropId: Id,
    organizationId: Id,
    plantingDate: Date,
  ): CropCycle {
    return new CropCycle(id, {
      fieldId,
      cropId,
      organizationId,
      plantingDate,
      health: CropHealth.GOOD,
      status: CropCycleStatus.ACTIVE,
    });
  }

  harvest(harvestDate: Date): void {
    this.props.harvestDate = harvestDate;
    this.props.status = CropCycleStatus.COMPLETED;
  }

  updateHealth(health: CropHealth): void {
    this.props.health = health;
  }
}
