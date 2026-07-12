import { AggregateRoot, Id } from '@farm/domain-core';
import { BuyerType } from '../value-objects/buyer-type.value-object';
import { BuyerCreated, BuyerUpdated } from '../events/finance-events';

interface BuyerProps {
  organizationId: Id;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  type: BuyerType;
  notes: string;
}

export class Buyer extends AggregateRoot<BuyerProps> {
  private constructor(id: Id, props: BuyerProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get contactPerson(): string {
    return this.props.contactPerson;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string {
    return this.props.phone;
  }

  get address(): string {
    return this.props.address;
  }

  get type(): BuyerType {
    return this.props.type;
  }

  get notes(): string {
    return this.props.notes;
  }

  static create(
    id: Id,
    organizationId: Id,
    name: string,
    contactPerson: string,
    email: string,
    phone: string,
    address: string,
    type: BuyerType,
    notes: string,
  ): Buyer {
    const buyer = new Buyer(id, {
      organizationId,
      name,
      contactPerson,
      email,
      phone,
      address,
      type,
      notes,
    });

    buyer.addDomainEvent(
      new BuyerCreated(id.toString(), {
        organizationId: organizationId.toString(),
        name,
        contactPerson,
        email,
        phone,
        address,
        type,
        notes,
      }),
    );

    return buyer;
  }

  update(
    name: string,
    contactPerson: string,
    email: string,
    phone: string,
    address: string,
    type: BuyerType,
    notes: string,
  ): void {
    this.props.name = name;
    this.props.contactPerson = contactPerson;
    this.props.email = email;
    this.props.phone = phone;
    this.props.address = address;
    this.props.type = type;
    this.props.notes = notes;

    this.addDomainEvent(
      new BuyerUpdated(this._id.toString(), {
        name,
        contactPerson,
        email,
        phone,
        address,
        type,
        notes,
      }),
    );
  }
}
