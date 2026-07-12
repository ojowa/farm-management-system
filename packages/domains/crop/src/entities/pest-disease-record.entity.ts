import { AggregateRoot, Id } from '@farm/domain-core';
import { Severity } from '../value-objects/severity.value-object';

export enum PestDiseaseType {
  PEST = 'PEST',
  DISEASE = 'DISEASE',
}

export enum PestDiseaseOutcome {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  ONGOING = 'ONGOING',
}

interface PestDiseaseRecordProps {
  organizationId: Id;
  cropCycleId: Id;
  farmId: Id;
  type: PestDiseaseType;
  name: string;
  severity: Severity;
  identifiedDate: Date;
  treatment?: string;
  treatedDate?: Date;
  outcome: PestDiseaseOutcome;
}

export class PestDiseaseRecord extends AggregateRoot<PestDiseaseRecordProps> {
  private constructor(id: Id, props: PestDiseaseRecordProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get cropCycleId(): Id {
    return this.props.cropCycleId;
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get type(): PestDiseaseType {
    return this.props.type;
  }

  get name(): string {
    return this.props.name;
  }

  get severity(): Severity {
    return this.props.severity;
  }

  get identifiedDate(): Date {
    return this.props.identifiedDate;
  }

  get treatment(): string | undefined {
    return this.props.treatment;
  }

  get treatedDate(): Date | undefined {
    return this.props.treatedDate;
  }

  get outcome(): PestDiseaseOutcome {
    return this.props.outcome;
  }

  static create(
    id: Id,
    organizationId: Id,
    cropCycleId: Id,
    farmId: Id,
    type: PestDiseaseType,
    name: string,
    severity: Severity,
    identifiedDate: Date,
  ): PestDiseaseRecord {
    return new PestDiseaseRecord(id, {
      organizationId,
      cropCycleId,
      farmId,
      type,
      name,
      severity,
      identifiedDate,
      outcome: PestDiseaseOutcome.PENDING,
    });
  }

  treat(treatment: string, treatedDate: Date): void {
    this.props.treatment = treatment;
    this.props.treatedDate = treatedDate;
    this.props.outcome = PestDiseaseOutcome.ONGOING;
  }

  resolve(): void {
    this.props.outcome = PestDiseaseOutcome.RESOLVED;
  }
}
