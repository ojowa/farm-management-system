import { AggregateRoot, Id } from '@farm/domain-core';
import { LivestockSpecies } from '../value-objects/livestock-species.value-object';
import { LivestockGender } from '../value-objects/livestock-gender.value-object';
import { LivestockCreated, LivestockUpdated, LivestockDeleted } from '../events/livestock-events';

export type LivestockStatus = 'ACTIVE' | 'SOLD' | 'DECEASED' | 'TRANSFERRED';

interface LivestockProps {
  farmId: Id;
  species: LivestockSpecies;
  breed: string;
  gender: LivestockGender;
  birthDate: Date;
  status: LivestockStatus;
}

export class Livestock extends AggregateRoot<LivestockProps> {
  private constructor(id: Id, props: LivestockProps) {
    super(id, props);
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get species(): LivestockSpecies {
    return this.props.species;
  }

  get breed(): string {
    return this.props.breed;
  }

  get gender(): LivestockGender {
    return this.props.gender;
  }

  get birthDate(): Date {
    return this.props.birthDate;
  }

  get status(): LivestockStatus {
    return this.props.status;
  }

  static create(
    id: Id,
    farmId: Id,
    species: LivestockSpecies,
    breed: string,
    gender: LivestockGender,
    birthDate: Date,
  ): Livestock {
    const livestock = new Livestock(id, {
      farmId,
      species,
      breed,
      gender,
      birthDate,
      status: 'ACTIVE',
    });

    livestock.addDomainEvent(
      new LivestockCreated(id.toString(), {
        farmId: farmId.toString(),
        species,
        breed,
        gender,
        birthDate: birthDate.toISOString(),
      }),
    );

    return livestock;
  }

  update(breed: string, birthDate: Date): void {
    this.props.breed = breed;
    this.props.birthDate = birthDate;

    this.addDomainEvent(
      new LivestockUpdated(this._id.toString(), {
        breed,
        birthDate: birthDate.toISOString(),
      }),
    );
  }

  changeStatus(status: LivestockStatus): void {
    this.props.status = status;

    this.addDomainEvent(
      new LivestockUpdated(this._id.toString(), { status }),
    );
  }

  delete(): void {
    this.addDomainEvent(new LivestockDeleted(this._id.toString()));
  }
}
