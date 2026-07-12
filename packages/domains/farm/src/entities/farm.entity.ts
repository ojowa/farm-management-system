import { AggregateRoot, Id } from '@farm/domain-core';
import { FarmType } from '../value-objects/farm-type.value-object';
import { GeoCoordinates } from '../value-objects/geo-coordinates.value-object';
import { FarmCreated, FarmUpdated, FarmDeleted } from '../events/farm-events';

export interface FarmProps {
  organizationId: string;
  name: string;
  farmType: FarmType;
  location: string;
  latitude: number;
  longitude: number;
  size: number;
  status: 'active' | 'inactive' | 'archived';
}

export class Farm extends AggregateRoot<FarmProps> {
  private constructor(id: Id, props: FarmProps) {
    super(id, props);
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get farmType(): FarmType {
    return this.props.farmType;
  }

  get location(): string {
    return this.props.location;
  }

  get latitude(): number {
    return this.props.latitude;
  }

  get longitude(): number {
    return this.props.longitude;
  }

  get size(): number {
    return this.props.size;
  }

  get status(): string {
    return this.props.status;
  }

  static create(props: FarmProps): Farm {
    const id = Id.create();
    const farm = new Farm(id, props);
    farm.addDomainEvent(new FarmCreated(id.toString(), { ...props }));
    return farm;
  }

  update(props: Partial<Omit<FarmProps, 'organizationId' | 'status'>>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.farmType !== undefined) this.props.farmType = props.farmType;
    if (props.location !== undefined) this.props.location = props.location;
    if (props.latitude !== undefined) this.props.latitude = props.latitude;
    if (props.longitude !== undefined) this.props.longitude = props.longitude;
    if (props.size !== undefined) this.props.size = props.size;
    this.addDomainEvent(new FarmUpdated(this.id.toString(), { ...props }));
  }

  changeStatus(status: FarmProps['status']): void {
    this.props.status = status;
    this.addDomainEvent(new FarmUpdated(this.id.toString(), { status }));
  }

  updateLocation(location: string, coordinates: GeoCoordinates): void {
    this.props.location = location;
    this.props.latitude = coordinates.latitude;
    this.props.longitude = coordinates.longitude;
    this.addDomainEvent(new FarmUpdated(this.id.toString(), { location, latitude: coordinates.latitude, longitude: coordinates.longitude }));
  }

  delete(): void {
    this.addDomainEvent(new FarmDeleted(this.id.toString()));
  }
}
