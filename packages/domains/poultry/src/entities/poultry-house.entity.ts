import { BaseEntity, Id } from '@farm/domain-core';

export interface PoultryHouseProps {
  farmId: string;
  name: string;
  capacity: number;
}

export class PoultryHouse extends BaseEntity<PoultryHouseProps> {
  private constructor(id: Id, props: PoultryHouseProps) {
    super(id, props);
  }

  static create(id: Id, props: PoultryHouseProps): PoultryHouse {
    return new PoultryHouse(id, props);
  }

  update(props: Partial<Pick<PoultryHouseProps, 'name' | 'capacity'>>): void {
    if (props.name) this.props.name = props.name;
    if (props.capacity) this.props.capacity = props.capacity;
  }

  get farmId(): string {
    return this.props.farmId;
  }

  get name(): string {
    return this.props.name;
  }

  get capacity(): number {
    return this.props.capacity;
  }
}
