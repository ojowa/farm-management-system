import { AggregateRoot, Id } from '@farm/domain-core';

interface YieldRecordProps {
  organizationId: Id;
  cropId: Id;
  cropCycleId: Id;
  quantity: number;
  unit: string;
  quality: string;
  harvestedDate: Date;
}

export class YieldRecord extends AggregateRoot<YieldRecordProps> {
  private constructor(id: Id, props: YieldRecordProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get cropId(): Id {
    return this.props.cropId;
  }

  get cropCycleId(): Id {
    return this.props.cropCycleId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unit(): string {
    return this.props.unit;
  }

  get quality(): string {
    return this.props.quality;
  }

  get harvestedDate(): Date {
    return this.props.harvestedDate;
  }

  static create(
    id: Id,
    organizationId: Id,
    cropId: Id,
    cropCycleId: Id,
    quantity: number,
    unit: string,
    quality: string,
    harvestedDate: Date,
  ): YieldRecord {
    return new YieldRecord(id, {
      organizationId,
      cropId,
      cropCycleId,
      quantity,
      unit,
      quality,
      harvestedDate,
    });
  }
}
