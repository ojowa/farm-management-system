import { AggregateRoot, Id } from '@farm/domain-core';
import { Money } from '../value-objects/money.value-object';
import { ExpenseCreated, ExpenseUpdated } from '../events/finance-events';

interface ExpenseProps {
  organizationId: Id;
  farmId: Id;
  title: string;
  amount: Money;
  date: Date;
}

export class Expense extends AggregateRoot<ExpenseProps> {
  private constructor(id: Id, props: ExpenseProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get farmId(): Id {
    return this.props.farmId;
  }

  get title(): string {
    return this.props.title;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get date(): Date {
    return this.props.date;
  }

  static create(
    id: Id,
    organizationId: Id,
    farmId: Id,
    title: string,
    amount: Money,
    date: Date,
  ): Expense {
    const expense = new Expense(id, {
      organizationId,
      farmId,
      title,
      amount,
      date,
    });

    expense.addDomainEvent(
      new ExpenseCreated(id.toString(), {
        organizationId: organizationId.toString(),
        farmId: farmId.toString(),
        title,
        amount: amount.toJSON(),
        date: date.toISOString(),
      }),
    );

    return expense;
  }

  update(title: string, amount: Money, date: Date): void {
    this.props.title = title;
    this.props.amount = amount;
    this.props.date = date;

    this.addDomainEvent(
      new ExpenseUpdated(this._id.toString(), {
        title,
        amount: amount.toJSON(),
        date: date.toISOString(),
      }),
    );
  }
}
