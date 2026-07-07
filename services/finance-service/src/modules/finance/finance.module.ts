import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { SaleController } from './sale.controller';
import { ProfitabilityController } from './profitability.controller';
import { ContractController } from './contract.controller';
import { MarketplaceController } from './marketplace.controller';
import { FinanceService } from './finance.service';
import { FinanceRepository } from './finance.repository';

@Module({
  controllers: [
    ExpenseController,
    SaleController,
    ProfitabilityController,
    ContractController,
    MarketplaceController,
  ],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
