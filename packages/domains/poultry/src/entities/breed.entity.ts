import { BaseEntity, Id } from '@farm/domain-core';

export interface BreedProps {
  name: string;
  birdType: string;
}

export class Breed extends BaseEntity<BreedProps> {
  private constructor(id: Id, props: BreedProps) {
    super(id, props);
  }

  static create(id: Id, props: BreedProps): Breed {
    return new Breed(id, props);
  }

  update(props: Partial<Pick<BreedProps, 'name' | 'birdType'>>): void {
    if (props.name) this.props.name = props.name;
    if (props.birdType) this.props.birdType = props.birdType;
  }

  get name(): string {
    return this.props.name;
  }

  get birdType(): string {
    return this.props.birdType;
  }
}
