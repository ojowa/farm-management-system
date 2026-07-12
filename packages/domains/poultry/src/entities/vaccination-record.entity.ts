import { BaseEntity, Id } from '@farm/domain-core';

export interface VaccinationRecordProps {
  flockId: string;
  vaccine: string;
  dosage: string;
  date: Date;
}

export class VaccinationRecord extends BaseEntity<VaccinationRecordProps> {
  private constructor(id: Id, props: VaccinationRecordProps) {
    super(id, props);
  }

  static create(id: Id, props: VaccinationRecordProps): VaccinationRecord {
    return new VaccinationRecord(id, props);
  }

  get flockId(): string {
    return this.props.flockId;
  }

  get vaccine(): string {
    return this.props.vaccine;
  }

  get dosage(): string {
    return this.props.dosage;
  }

  get date(): Date {
    return this.props.date;
  }
}
