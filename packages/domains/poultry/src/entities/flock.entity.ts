import { AggregateRoot, Id, BaseDomainEvent } from '@farm/domain-core';

export enum FlockStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  CLOSED = 'CLOSED',
}

export interface FlockProps {
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: Date;
  currentAgeDays: number;
  status: FlockStatus;
}

export class FlockCreatedEvent extends BaseDomainEvent {
  readonly eventName = 'FlockCreated';
}

export class FlockUpdatedEvent extends BaseDomainEvent {
  readonly eventName = 'FlockUpdated';
}

export class FlockMortalityRecordedEvent extends BaseDomainEvent {
  readonly eventName = 'FlockMortalityRecorded';
  readonly mortalityCount: number;

  constructor(aggregateId: string, mortalityCount: number) {
    super(aggregateId);
    this.mortalityCount = mortalityCount;
  }
}

export class FlockSoldEvent extends BaseDomainEvent {
  readonly eventName = 'FlockSold';
}

export class Flock extends AggregateRoot<FlockProps> {
  private constructor(id: Id, props: FlockProps) {
    super(id, props);
  }

  static create(id: Id, props: Omit<FlockProps, 'status' | 'currentCount' | 'currentAgeDays'>): Flock {
    const flock = new Flock(id, {
      ...props,
      currentCount: props.birdCount,
      currentAgeDays: 0,
      status: FlockStatus.ACTIVE,
    });

    flock.addDomainEvent(new FlockCreatedEvent(id.toString()));
    return flock;
  }

  update(props: Partial<Pick<FlockProps, 'penId' | 'breedId' | 'batchCode'>>): void {
    if (props.penId) this.props.penId = props.penId;
    if (props.breedId) this.props.breedId = props.breedId;
    if (props.batchCode) this.props.batchCode = props.batchCode;

    this.addDomainEvent(new FlockUpdatedEvent(this.id.toString()));
  }

  recordMortality(count: number): void {
    if (count > this.props.currentCount) {
      throw new Error('Mortality count cannot exceed current bird count');
    }

    this.props.currentCount -= count;
    this.addDomainEvent(new FlockMortalityRecordedEvent(this.id.toString(), count));
  }

  sell(): void {
    if (this.props.status !== FlockStatus.ACTIVE) {
      throw new Error('Only active flocks can be sold');
    }

    this.props.status = FlockStatus.SOLD;
    this.addDomainEvent(new FlockSoldEvent(this.id.toString()));
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get farmId(): string {
    return this.props.farmId;
  }

  get penId(): string {
    return this.props.penId;
  }

  get breedId(): string {
    return this.props.breedId;
  }

  get batchCode(): string {
    return this.props.batchCode;
  }

  get birdCount(): number {
    return this.props.birdCount;
  }

  get currentCount(): number {
    return this.props.currentCount;
  }

  get arrivalDate(): Date {
    return this.props.arrivalDate;
  }

  get currentAgeDays(): number {
    return this.props.currentAgeDays;
  }

  get status(): FlockStatus {
    return this.props.status;
  }
}
