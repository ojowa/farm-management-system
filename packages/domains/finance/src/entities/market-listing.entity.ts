import { AggregateRoot, Id } from '@farm/domain-core';
import { Money } from '../value-objects/money.value-object';
import { ListingStatus } from '../value-objects/listing-status.value-object';
import {
  MarketListingCreated,
  MarketListingSold,
  MarketListingCancelled,
} from '../events/finance-events';

interface MarketListingProps {
  organizationId: Id;
  buyerId: Id;
  entityType: string;
  entityId: Id;
  title: string;
  price: Money;
  unit: string;
  quantity: number;
  status: ListingStatus;
  listedDate: Date;
  soldDate: Date | null;
}

export class MarketListing extends AggregateRoot<MarketListingProps> {
  private constructor(id: Id, props: MarketListingProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get buyerId(): Id {
    return this.props.buyerId;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): Id {
    return this.props.entityId;
  }

  get title(): string {
    return this.props.title;
  }

  get price(): Money {
    return this.props.price;
  }

  get unit(): string {
    return this.props.unit;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get status(): ListingStatus {
    return this.props.status;
  }

  get listedDate(): Date {
    return this.props.listedDate;
  }

  get soldDate(): Date | null {
    return this.props.soldDate;
  }

  static create(
    id: Id,
    organizationId: Id,
    buyerId: Id,
    entityType: string,
    entityId: Id,
    title: string,
    price: Money,
    unit: string,
    quantity: number,
    listedDate: Date,
  ): MarketListing {
    const listing = new MarketListing(id, {
      organizationId,
      buyerId,
      entityType,
      entityId,
      title,
      price,
      unit,
      quantity,
      status: ListingStatus.ACTIVE,
      listedDate,
      soldDate: null,
    });

    listing.addDomainEvent(
      new MarketListingCreated(id.toString(), {
        organizationId: organizationId.toString(),
        buyerId: buyerId.toString(),
        entityType,
        entityId: entityId.toString(),
        title,
        price: price.toJSON(),
        unit,
        quantity,
        listedDate: listedDate.toISOString(),
      }),
    );

    return listing;
  }

  sell(soldDate: Date): void {
    if (this.props.status !== ListingStatus.ACTIVE) {
      throw new Error('Only active listings can be sold');
    }
    this.props.status = ListingStatus.SOLD;
    this.props.soldDate = soldDate;

    this.addDomainEvent(
      new MarketListingSold(this._id.toString(), {
        soldDate: soldDate.toISOString(),
      }),
    );
  }

  cancel(): void {
    if (this.props.status !== ListingStatus.ACTIVE) {
      throw new Error('Only active listings can be cancelled');
    }
    this.props.status = ListingStatus.CANCELLED;

    this.addDomainEvent(
      new MarketListingCancelled(this._id.toString(), {
        status: ListingStatus.CANCELLED,
      }),
    );
  }
}
