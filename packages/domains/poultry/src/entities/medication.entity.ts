import { BaseEntity, Id } from '@farm/domain-core';

export enum MedicationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface MedicationProps {
  flockId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate: Date;
  notes: string;
  status: MedicationStatus;
}

export class Medication extends BaseEntity<MedicationProps> {
  private constructor(id: Id, props: MedicationProps) {
    super(id, props);
  }

  static create(id: Id, props: Omit<MedicationProps, 'status'>): Medication {
    return new Medication(id, {
      ...props,
      status: MedicationStatus.ACTIVE,
    });
  }

  complete(): void {
    if (this.props.status !== MedicationStatus.ACTIVE) {
      throw new Error('Only active medications can be completed');
    }
    this.props.status = MedicationStatus.COMPLETED;
  }

  get flockId(): string {
    return this.props.flockId;
  }

  get name(): string {
    return this.props.name;
  }

  get dosage(): string {
    return this.props.dosage;
  }

  get frequency(): string {
    return this.props.frequency;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get notes(): string {
    return this.props.notes;
  }

  get status(): MedicationStatus {
    return this.props.status;
  }
}
