import { BaseEntity, Id } from '@farm/domain-core';

export interface FeedingRecordProps {
  flockId: string;
  feedType: string;
  quantityKg: number;
  date: Date;
}

export class FeedingRecord extends BaseEntity<FeedingRecordProps> {
  private constructor(id: Id, props: FeedingRecordProps) {
    super(id, props);
  }

  static create(id: Id, props: FeedingRecordProps): FeedingRecord {
    return new FeedingRecord(id, props);
  }

  get flockId(): string {
    return this.props.flockId;
  }

  get feedType(): string {
    return this.props.feedType;
  }

  get quantityKg(): number {
    return this.props.quantityKg;
  }

  get date(): Date {
    return this.props.date;
  }
}
