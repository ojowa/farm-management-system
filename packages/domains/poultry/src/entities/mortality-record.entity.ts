import { BaseEntity, Id } from '@farm/domain-core';
import { Flock } from './flock.entity';

export interface MortalityRecordProps {
  flockId: string;
  count: number;
  cause: string;
  date: Date;
}

export class MortalityRecord extends BaseEntity<MortalityRecordProps> {
  private constructor(id: Id, props: MortalityRecordProps) {
    super(id, props);
  }

  static create(id: Id, props: MortalityRecordProps, flock: Flock): MortalityRecord {
    flock.recordMortality(props.count);
    return new MortalityRecord(id, props);
  }

  delete(flock: Flock): void {
    flock.recordMortality(-this.props.count);
  }

  get flockId(): string {
    return this.props.flockId;
  }

  get count(): number {
    return this.props.count;
  }

  get cause(): string {
    return this.props.cause;
  }

  get date(): Date {
    return this.props.date;
  }
}
