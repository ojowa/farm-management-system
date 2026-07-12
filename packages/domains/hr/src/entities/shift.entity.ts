import { BaseEntity, Id } from '@farm/domain-core';

interface ShiftProps {
  organizationId: Id;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
}

export class Shift extends BaseEntity<ShiftProps> {
  private constructor(id: Id, props: ShiftProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  get color(): string {
    return this.props.color;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  static create(
    id: Id,
    organizationId: Id,
    name: string,
    startTime: string,
    endTime: string,
    color: string,
  ): Shift {
    return new Shift(id, { organizationId, name, startTime, endTime, color, isActive: true });
  }

  update(name: string, startTime: string, endTime: string, color: string): void {
    this.props.name = name;
    this.props.startTime = startTime;
    this.props.endTime = endTime;
    this.props.color = color;
  }

  deactivate(): void {
    this.props.isActive = false;
  }
}
