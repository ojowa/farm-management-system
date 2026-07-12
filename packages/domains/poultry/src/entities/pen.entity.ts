import { BaseEntity, Id } from '@farm/domain-core';

export interface PenProps {
  poultryHouseId: string;
  name: string;
  capacity: number;
}

export class Pen extends BaseEntity<PenProps> {
  private constructor(id: Id, props: PenProps) {
    super(id, props);
  }

  static create(id: Id, props: PenProps): Pen {
    return new Pen(id, props);
  }

  update(props: Partial<Pick<PenProps, 'name' | 'capacity'>>): void {
    if (props.name) this.props.name = props.name;
    if (props.capacity) this.props.capacity = props.capacity;
  }

  get poultryHouseId(): string {
    return this.props.poultryHouseId;
  }

  get name(): string {
    return this.props.name;
  }

  get capacity(): number {
    return this.props.capacity;
  }
}
