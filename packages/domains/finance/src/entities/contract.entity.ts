import { AggregateRoot, Id } from '@farm/domain-core';
import { Money } from '../value-objects/money.value-object';
import { ContractType } from '../value-objects/contract-type.value-object';
import { ContractStatus } from '../value-objects/contract-status.value-object';
import {
  ContractCreated,
  ContractActivated,
  ContractCompleted,
  ContractCancelled,
} from '../events/finance-events';

interface ContractProps {
  organizationId: Id;
  type: ContractType;
  buyerSellerName: string;
  entityId: Id;
  entityType: string;
  startDate: Date;
  endDate: Date;
  value: Money;
  status: ContractStatus;
  terms: string;
}

export class Contract extends AggregateRoot<ContractProps> {
  private constructor(id: Id, props: ContractProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get type(): ContractType {
    return this.props.type;
  }

  get buyerSellerName(): string {
    return this.props.buyerSellerName;
  }

  get entityId(): Id {
    return this.props.entityId;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get value(): Money {
    return this.props.value;
  }

  get status(): ContractStatus {
    return this.props.status;
  }

  get terms(): string {
    return this.props.terms;
  }

  static create(
    id: Id,
    organizationId: Id,
    type: ContractType,
    buyerSellerName: string,
    entityId: Id,
    entityType: string,
    startDate: Date,
    endDate: Date,
    value: Money,
    terms: string,
  ): Contract {
    const contract = new Contract(id, {
      organizationId,
      type,
      buyerSellerName,
      entityId,
      entityType,
      startDate,
      endDate,
      value,
      status: ContractStatus.DRAFT,
      terms,
    });

    contract.addDomainEvent(
      new ContractCreated(id.toString(), {
        organizationId: organizationId.toString(),
        type,
        buyerSellerName,
        entityId: entityId.toString(),
        entityType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        value: value.toJSON(),
        terms,
      }),
    );

    return contract;
  }

  activate(): void {
    if (this.props.status !== ContractStatus.DRAFT) {
      throw new Error('Only draft contracts can be activated');
    }
    this.props.status = ContractStatus.ACTIVE;

    this.addDomainEvent(
      new ContractActivated(this._id.toString(), {
        status: ContractStatus.ACTIVE,
      }),
    );
  }

  complete(): void {
    if (this.props.status !== ContractStatus.ACTIVE) {
      throw new Error('Only active contracts can be completed');
    }
    this.props.status = ContractStatus.COMPLETED;

    this.addDomainEvent(
      new ContractCompleted(this._id.toString(), {
        status: ContractStatus.COMPLETED,
      }),
    );
  }

  cancel(): void {
    if (
      this.props.status === ContractStatus.COMPLETED ||
      this.props.status === ContractStatus.CANCELLED
    ) {
      throw new Error('Completed or cancelled contracts cannot be cancelled');
    }
    this.props.status = ContractStatus.CANCELLED;

    this.addDomainEvent(
      new ContractCancelled(this._id.toString(), {
        status: ContractStatus.CANCELLED,
      }),
    );
  }
}
