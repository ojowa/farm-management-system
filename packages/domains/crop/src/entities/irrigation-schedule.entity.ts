import { AggregateRoot, Id } from '@farm/domain-core';

interface IrrigationScheduleProps {
  organizationId: Id;
  farmId: Id;
  cropCycleId: Id;
  name: string;
  frequency: string;
  waterAmount: number;
  unit: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
}

export class IrrigationSchedule extends AggregateRoot<IrrigationScheduleProps> {
  private constructor(id: Id, props: IrrigationScheduleProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get cropCycleId(): Id {
    return this.props.cropCycleId;
  }

  get name(): string {
    return this.props.name;
  }

  get frequency(): string {
    return this.props.frequency;
  }

  get waterAmount(): number {
    return this.props.waterAmount;
  }

  get unit(): string {
    return this.props.unit;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date | undefined {
    return this.props.endDate;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastRun(): Date | undefined {
    return this.props.lastRun;
  }

  get nextRun(): Date {
    return this.props.nextRun;
  }

  static create(
    id: Id,
    organizationId: Id,
    farmId: Id,
    cropCycleId: Id,
    name: string,
    frequency: string,
    waterAmount: number,
    unit: string,
    startDate: Date,
    nextRun: Date,
  ): IrrigationSchedule {
    return new IrrigationSchedule(id, {
      organizationId,
      farmId,
      cropCycleId,
      name,
      frequency,
      waterAmount,
      unit,
      startDate,
      isActive: true,
      nextRun,
    });
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  recordExecution(executedAt: Date, nextRun: Date): void {
    this.props.lastRun = executedAt;
    this.props.nextRun = nextRun;
  }
}
