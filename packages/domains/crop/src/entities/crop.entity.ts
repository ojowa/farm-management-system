import { AggregateRoot, Id } from '@farm/domain-core';
import { CropCreated, CropUpdated, CropDeleted } from '../events/crop-events';

interface CropProps {
  name: string;
  organizationId: Id;
}

export class Crop extends AggregateRoot<CropProps> {
  private constructor(id: Id, props: CropProps) {
    super(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  static create(id: Id, name: string, organizationId: Id): Crop {
    const crop = new Crop(id, { name, organizationId });
    crop.addDomainEvent(new CropCreated(id.toString(), { name, organizationId: organizationId.toString() }));
    return crop;
  }

  update(name: string): void {
    this.props.name = name;
    this.addDomainEvent(new CropUpdated(this._id.toString(), { name }));
  }

  delete(): void {
    this.addDomainEvent(new CropDeleted(this._id.toString()));
  }
}
