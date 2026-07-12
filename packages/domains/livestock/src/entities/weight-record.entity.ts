import { AggregateRoot, Id } from '@farm/domain-core';

interface WeightRecordProps {
  organizationId: Id;
  livestockId: Id;
  flockId?: Id;
  weight: number;
  unit: string;
  recordedDate: Date;
  notes: string;
}

export class WeightRecord extends AggregateRoot<WeightRecordProps> {
  private constructor(id: Id, props: WeightRecordProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get livestockId(): Id {
    return this.props.livestockId;
  }

  get flockId(): Id | undefined {
    return this.props.flockId;
  }

  get weight(): number {
    return this.props.weight;
  }

  get unit(): string {
    return this.props.unit;
  }

  get recordedDate(): Date {
    return this.props.recordedDate;
  }

  get notes(): string {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    livestockId: Id,
    weight: number,
    unit: string,
    recordedDate: Date,
    notes: string,
    flockId?: Id,
  ): WeightRecord {
    return new WeightRecord(id, {
      organizationId,
      livestockId,
      flockId,
      weight,
      unit,
      recordedDate,
      notes,
    });
  }
}
