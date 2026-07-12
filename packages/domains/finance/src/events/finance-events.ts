import { BaseDomainEvent } from '@farm/domain-core';

export class ExpenseCreated extends BaseDomainEvent {
  readonly eventName = 'ExpenseCreated';
}

export class ExpenseUpdated extends BaseDomainEvent {
  readonly eventName = 'ExpenseUpdated';
}

export class SaleCreated extends BaseDomainEvent {
  readonly eventName = 'SaleCreated';
}

export class SaleUpdated extends BaseDomainEvent {
  readonly eventName = 'SaleUpdated';
}

export class ContractCreated extends BaseDomainEvent {
  readonly eventName = 'ContractCreated';
}

export class ContractActivated extends BaseDomainEvent {
  readonly eventName = 'ContractActivated';
}

export class ContractCompleted extends BaseDomainEvent {
  readonly eventName = 'ContractCompleted';
}

export class ContractCancelled extends BaseDomainEvent {
  readonly eventName = 'ContractCancelled';
}

export class BuyerCreated extends BaseDomainEvent {
  readonly eventName = 'BuyerCreated';
}

export class BuyerUpdated extends BaseDomainEvent {
  readonly eventName = 'BuyerUpdated';
}

export class MarketListingCreated extends BaseDomainEvent {
  readonly eventName = 'MarketListingCreated';
}

export class MarketListingSold extends BaseDomainEvent {
  readonly eventName = 'MarketListingSold';
}

export class MarketListingCancelled extends BaseDomainEvent {
  readonly eventName = 'MarketListingCancelled';
}
