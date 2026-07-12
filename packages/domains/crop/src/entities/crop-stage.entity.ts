import { AggregateRoot, Id } from '@farm/domain-core';
import { CropStageType } from '../value-objects/crop-stage-type.value-object';

interface CropStageProps {
  organizationId: Id;
  cropCycleId: Id;
  stage: CropStageType;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export class CropStage extends AggregateRoot<CropStageProps> {
  private constructor(id: Id, props: CropStageProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get cropCycleId(): Id {
    return this.props.cropCycleId;
  }

  get stage(): CropStageType {
    return this.props.stage;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date | undefined {
    return this.props.endDate;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get isCompleted(): boolean {
    return this.props.endDate !== undefined;
  }

  static create(
    id: Id,
    organizationId: Id,
    cropCycleId: Id,
    stage: CropStageType,
    startDate: Date,
    notes?: string,
  ): CropStage {
    return new CropStage(id, {
      organizationId,
      cropCycleId,
      stage,
      startDate,
      notes,
    });
  }

  complete(endDate: Date, notes?: string): void {
    this.props.endDate = endDate;
    if (notes) {
      this.props.notes = notes;
    }
  }
}
