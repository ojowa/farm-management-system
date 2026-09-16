import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';
import { Expense, Sale, Contract, Buyer, MarketListing } from '../../domain/entities/finance.entity';

@Injectable()
export class FinanceEventService {
  constructor(private readonly events: EventBus) {}

  emitExpenseCreatedEvent(expense: Expense) {
    this.events.emitDomainEvent('finance', 'created', expense);
  }

  emitExpenseUpdatedEvent(expense: Expense) {
    this.events.emitDomainEvent('finance', 'updated', expense);
  }

  emitExpenseDeletedEvent(expenseId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: expenseId });
  }

  emitSaleCreatedEvent(sale: Sale) {
    this.events.emitDomainEvent('finance', 'created', sale);
  }

  emitSaleUpdatedEvent(sale: Sale) {
    this.events.emitDomainEvent('finance', 'updated', sale);
  }

  emitSaleDeletedEvent(saleId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: saleId });
  }

  emitContractCreatedEvent(contract: Contract) {
    this.events.emitDomainEvent('finance', 'created', contract);
  }

  emitContractUpdatedEvent(contract: Contract) {
    this.events.emitDomainEvent('finance', 'updated', contract);
  }

  emitContractDeletedEvent(contractId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: contractId });
  }

  emitBuyerCreatedEvent(buyer: Buyer) {
    this.events.emitDomainEvent('finance', 'created', buyer);
  }

  emitBuyerUpdatedEvent(buyer: Buyer) {
    this.events.emitDomainEvent('finance', 'updated', buyer);
  }

  emitBuyerDeletedEvent(buyerId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: buyerId });
  }

  emitMarketListingCreatedEvent(listing: MarketListing) {
    this.events.emitDomainEvent('finance', 'created', listing);
  }

  emitMarketListingUpdatedEvent(listing: MarketListing) {
    this.events.emitDomainEvent('finance', 'updated', listing);
  }

  emitMarketListingDeletedEvent(listingId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: listingId });
  }

  emitBudgetCreatedEvent(budget: any) {
    this.events.emitDomainEvent('finance', 'created', budget);
  }

  emitBudgetUpdatedEvent(budget: any) {
    this.events.emitDomainEvent('finance', 'updated', budget);
  }

  emitBudgetDeletedEvent(budgetId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: budgetId });
  }
}
