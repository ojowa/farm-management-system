import { AggregateRoot, Id } from '@farm/domain-core';
import { Money } from '../value-objects/money.value-object';
import { SaleCreated, SaleUpdated } from '../events/finance-events';

interface SaleProps {
  organizationId: Id;
  farmId: Id;
  item: string;
  quantity: number;
  price: Money;
  total: Money;
  date: Date;
}

export class Sale extends AggregateRoot<SaleProps> {
  private constructor(id: Id, props: SaleProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get item(): string {
    return this.props.item;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get price(): Money {
    return this.props.price;
  }

  get total(): Money {
    return this.props.total;
  }

  get date(): Date {
    return this.props.date;
  }

  static create(
    id: Id,
    organizationId: Id,
    farmId: Id,
    item: string,
    quantity: number,
    price: Money,
    date: Date,
  ): Sale {
    const total = price.multiply(quantity);

    const sale = new Sale(id, {
      organizationId,
      farmId,
      item,
      quantity,
      price,
      total,
      date,
    });

    sale.addDomainEvent(
      new SaleCreated(id.toString(), {
        organizationId: organizationId.toString(),
        farmId: farmId.toString(),
        item,
        quantity,
        price: price.toJSON(),
        total: total.toJSON(),
        date: date.toISOString(),
      }),
    );

    return sale;
  }

  update(item: string, quantity: number, price: Money, date: Date): void {
    this.props.item = item;
    this.props.quantity = quantity;
    this.props.price = price;
    this.props.total = price.multiply(quantity);
    this.props.date = date;

    this.addDomainEvent(
      new SaleUpdated(this._id.toString(), {
        item,
        quantity,
        price: price.toJSON(),
        total: this.props.total.toJSON(),
        date: date.toISOString(),
      }),
    );
  }
}
