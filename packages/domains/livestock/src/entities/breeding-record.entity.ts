import { AggregateRoot, Id } from '@farm/domain-core';
import { BreedingStatus } from '../value-objects/breeding-status.value-object';

interface BreedingRecordProps {
  organizationId: Id;
  sireId: Id;
  sireName: string;
  damId: Id;
  damName: string;
  breedingDate: Date;
  expectedDueDate: Date;
  actualBirthDate?: Date;
  offspringCount: number;
  status: BreedingStatus;
  notes: string;
}

export class BreedingRecord extends AggregateRoot<BreedingRecordProps> {
  private constructor(id: Id, props: BreedingRecordProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get sireId(): Id {
    return this.props.sireId;
  }

  get sireName(): string {
    return this.props.sireName;
  }

  get damId(): Id {
    return this.props.damId;
  }

  get damName(): string {
    return this.props.damName;
  }

  get breedingDate(): Date {
    return this.props.breedingDate;
  }

  get expectedDueDate(): Date {
    return this.props.expectedDueDate;
  }

  get actualBirthDate(): Date | undefined {
    return this.props.actualBirthDate;
  }

  get offspringCount(): number {
    return this.props.offspringCount;
  }

  get status(): BreedingStatus {
    return this.props.status;
  }

  get notes(): string {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    sireId: Id,
    sireName: string,
    damId: Id,
    damName: string,
    breedingDate: Date,
    expectedDueDate: Date,
    notes: string,
  ): BreedingRecord {
    return new BreedingRecord(id, {
      organizationId,
      sireId,
      sireName,
      damId,
      damName,
      breedingDate,
      expectedDueDate,
      offspringCount: 0,
      status: BreedingStatus.PLANNED,
      notes,
    });
  }

  update(expectedDueDate: Date, notes: string): void {
    this.props.expectedDueDate = expectedDueDate;
    this.props.notes = notes;
  }

  recordBirth(actualBirthDate: Date, offspringCount: number): void {
    this.props.actualBirthDate = actualBirthDate;
    this.props.offspringCount = offspringCount;
    this.props.status = BreedingStatus.BORN;
  }
}
