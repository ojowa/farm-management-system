import { AggregateRoot, Id } from '@farm/domain-core';

export type VaccinationStatus = 'SCHEDULED' | 'ADMINISTERED' | 'CANCELLED' | 'MISSED';

interface VaccinationScheduleProps {
  organizationId: Id;
  livestockId: Id;
  vaccineName: string;
  scheduledDate: Date;
  administeredDate?: Date;
  status: VaccinationStatus;
  notes: string;
}

export class VaccinationSchedule extends AggregateRoot<VaccinationScheduleProps> {
  private constructor(id: Id, props: VaccinationScheduleProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get livestockId(): Id {
    return this.props.livestockId;
  }

  get vaccineName(): string {
    return this.props.vaccineName;
  }

  get scheduledDate(): Date {
    return this.props.scheduledDate;
  }

  get administeredDate(): Date | undefined {
    return this.props.administeredDate;
  }

  get status(): VaccinationStatus {
    return this.props.status;
  }

  get notes(): string {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    livestockId: Id,
    vaccineName: string,
    scheduledDate: Date,
    notes: string,
  ): VaccinationSchedule {
    return new VaccinationSchedule(id, {
      organizationId,
      livestockId,
      vaccineName,
      scheduledDate,
      status: 'SCHEDULED',
      notes,
    });
  }

  administer(administeredDate: Date): void {
    this.props.administeredDate = administeredDate;
    this.props.status = 'ADMINISTERED';
  }

  cancel(): void {
    this.props.status = 'CANCELLED';
  }
}
