import { Injectable } from '@nestjs/common';
import { emitFinanceEvent } from '@farm/utils';
import { Expense, Sale, Contract, Buyer, MarketListing } from '../../domain/entities/finance.entity';

@Injectable()
export class FinanceEventService {
  async emitExpenseCreatedEvent(expense: Expense) {
    await emitFinanceEvent('created', expense);
  }

  async emitExpenseUpdatedEvent(expense: Expense) {
    await emitFinanceEvent('updated', expense);
  }

  async emitExpenseDeletedEvent(expenseId: string) {
    await emitFinanceEvent('deleted', { id: expenseId });
  }

  async emitSaleCreatedEvent(sale: Sale) {
    await emitFinanceEvent('created', sale);
  }

  async emitSaleUpdatedEvent(sale: Sale) {
    await emitFinanceEvent('updated', sale);
  }

  async emitSaleDeletedEvent(saleId: string) {
    await emitFinanceEvent('deleted', { id: saleId });
  }

  async emitContractCreatedEvent(contract: Contract) {
    await emitFinanceEvent('created', contract);
  }

  async emitContractUpdatedEvent(contract: Contract) {
    await emitFinanceEvent('updated', contract);
  }

  async emitContractDeletedEvent(contractId: string) {
    await emitFinanceEvent('deleted', { id: contractId });
  }

  async emitBuyerCreatedEvent(buyer: Buyer) {
    await emitFinanceEvent('created', buyer);
  }

  async emitBuyerUpdatedEvent(buyer: Buyer) {
    await emitFinanceEvent('updated', buyer);
  }

  async emitBuyerDeletedEvent(buyerId: string) {
    await emitFinanceEvent('deleted', { id: buyerId });
  }

  async emitMarketListingCreatedEvent(listing: MarketListing) {
    await emitFinanceEvent('created', listing);
  }

  async emitMarketListingUpdatedEvent(listing: MarketListing) {
    await emitFinanceEvent('updated', listing);
  }

  async emitMarketListingDeletedEvent(listingId: string) {
    await emitFinanceEvent('deleted', { id: listingId });
  }
}
