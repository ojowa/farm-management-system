import { AggregateRoot, Id } from '@farm/domain-core';
import { BroadcastType } from '../value-objects/broadcast-type.value-object';
import { BroadcastCreated, BroadcastDeactivated } from '../events/platform-events';

export interface BroadcastProps {
  title: string;
  message: string;
  type: BroadcastType;
  targetOrgs: string[];
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date | null;
  createdById: string;
}

export class Broadcast extends AggregateRoot<BroadcastProps> {
  private constructor(id: Id, props: BroadcastProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<BroadcastProps, 'isActive'> & { isActive?: boolean }
  ): Broadcast {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!props.message || props.message.trim().length === 0) {
      throw new Error('Message is required');
    }
    if (!Object.values(BroadcastType).includes(props.type)) {
      throw new Error('Invalid broadcast type');
    }
    if (!props.createdById || props.createdById.trim().length === 0) {
      throw new Error('Created by ID is required');
    }
    if (props.startsAt && props.expiresAt && props.expiresAt <= props.startsAt) {
      throw new Error('Expiry date must be after start date');
    }

    const broadcast = new Broadcast(id, {
      title: props.title.trim(),
      message: props.message.trim(),
      type: props.type,
      targetOrgs: props.targetOrgs ?? [],
      isActive: props.isActive ?? true,
      startsAt: props.startsAt,
      expiresAt: props.expiresAt ?? null,
      createdById: props.createdById,
    });

    broadcast.addDomainEvent(
      new BroadcastCreated(id.toString(), {
        title: props.title,
        type: props.type,
        createdById: props.createdById,
      })
    );

    return broadcast;
  }

  static reconstitute(id: Id, props: BroadcastProps): Broadcast {
    return new Broadcast(id, props);
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  get type(): BroadcastType {
    return this.props.type;
  }

  get targetOrgs(): string[] {
    return this.props.targetOrgs;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new Error('Broadcast is already deactivated');
    }
    this.props.isActive = false;
    this.addDomainEvent(
      new BroadcastDeactivated(this.id.toString(), {
        title: this.props.title,
      })
    );
  }
}
