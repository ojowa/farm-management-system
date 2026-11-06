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

  emitExpenseDeletedEvent(expenseId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: expenseId, organizationId });
  }

  emitSaleCreatedEvent(sale: Sale) {
    this.events.emitDomainEvent('finance', 'created', sale);
  }

  emitSaleUpdatedEvent(sale: Sale) {
    this.events.emitDomainEvent('finance', 'updated', sale);
  }

  emitSaleDeletedEvent(saleId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: saleId, organizationId });
  }

  emitContractCreatedEvent(contract: Contract) {
    this.events.emitDomainEvent('finance', 'created', contract);
  }

  emitContractUpdatedEvent(contract: Contract) {
    this.events.emitDomainEvent('finance', 'updated', contract);
  }

  emitContractDeletedEvent(contractId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: contractId, organizationId });
  }

  emitBuyerCreatedEvent(buyer: Buyer) {
    this.events.emitDomainEvent('finance', 'created', buyer);
  }

  emitBuyerUpdatedEvent(buyer: Buyer) {
    this.events.emitDomainEvent('finance', 'updated', buyer);
  }

  emitBuyerDeletedEvent(buyerId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: buyerId, organizationId });
  }

  emitMarketListingCreatedEvent(listing: MarketListing) {
    this.events.emitDomainEvent('finance', 'created', listing);
  }

  emitMarketListingUpdatedEvent(listing: MarketListing) {
    this.events.emitDomainEvent('finance', 'updated', listing);
  }

  emitMarketListingDeletedEvent(listingId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: listingId, organizationId });
  }

  emitBudgetCreatedEvent(budget: any) {
    this.events.emitDomainEvent('finance', 'created', budget);
  }

  emitBudgetUpdatedEvent(budget: any) {
    this.events.emitDomainEvent('finance', 'updated', budget);
  }

  emitBudgetDeletedEvent(budgetId: string, organizationId: string) {
    this.events.emitDomainEvent('finance', 'deleted', { id: budgetId, organizationId });
  }

  emitLedgerStatusChangedEvent(entityType: string, entityId: string, fromStatus: string, toStatus: string, organizationId: string) {
    this.events.emit('finance.ledger.status.changed', {
      entityType,
      entityId,
      fromStatus,
      toStatus,
      organizationId,
    });
  }
}
