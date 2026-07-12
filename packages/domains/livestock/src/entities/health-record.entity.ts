import { AggregateRoot, Id } from '@farm/domain-core';
import { HealthRecordType } from '../value-objects/health-record-type.value-object';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface HealthRecordProps {
  organizationId: Id;
  livestockId: Id;
  type: HealthRecordType;
  date: Date;
  description: string;
  veterinarian: string;
  medications: Medication[];
  cost: number;
  nextCheckupDate?: Date;
}

export class HealthRecord extends AggregateRoot<HealthRecordProps> {
  private constructor(id: Id, props: HealthRecordProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get livestockId(): Id {
    return this.props.livestockId;
  }

  get type(): HealthRecordType {
    return this.props.type;
  }

  get date(): Date {
    return this.props.date;
  }

  get description(): string {
    return this.props.description;
  }

  get veterinarian(): string {
    return this.props.veterinarian;
  }

  get medications(): Medication[] {
    return this.props.medications;
  }

  get cost(): number {
    return this.props.cost;
  }

  get nextCheckupDate(): Date | undefined {
    return this.props.nextCheckupDate;
  }

  static create(
    id: Id,
    organizationId: Id,
    livestockId: Id,
    type: HealthRecordType,
    date: Date,
    description: string,
    veterinarian: string,
    medications: Medication[],
    cost: number,
    nextCheckupDate?: Date,
  ): HealthRecord {
    return new HealthRecord(id, {
      organizationId,
      livestockId,
      type,
      date,
      description,
      veterinarian,
      medications,
      cost,
      nextCheckupDate,
    });
  }
}
