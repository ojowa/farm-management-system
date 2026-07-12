import { BaseEntity, Id } from '@farm/domain-core';
import { DevicePlatform } from '../value-objects/device-platform.value-object';

export interface DeviceTokenProps {
  userId: string;
  token: string;
  platform: DevicePlatform;
  active: boolean;
  createdAt: Date;
}

export class DeviceToken extends BaseEntity<DeviceTokenProps> {
  private constructor(id: Id, props: DeviceTokenProps) {
    super(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get token(): string {
    return this.props.token;
  }

  get platform(): DevicePlatform {
    return this.props.platform;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(props: Omit<DeviceTokenProps, 'active' | 'createdAt'>): DeviceToken {
    const id = Id.create();
    return new DeviceToken(id, {
      ...props,
      active: true,
      createdAt: new Date(),
    });
  }

  deactivate(): void {
    this.props.active = false;
  }
}
