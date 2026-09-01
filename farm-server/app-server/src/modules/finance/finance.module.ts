import { Module } from '@nestjs/common';
import {
  ExpenseController,
  SaleController,
  ContractController,
  MarketplaceController,
} from './presentation/controllers/finance.controller';
import { ProfitabilityController } from './presentation/controllers/profitability.controller';
import { FinanceApplicationService } from './application/services/finance.service';
import { ProfitabilityService } from './application/services/profitability.service';
import {
  PrismaExpenseRepository,
  PrismaSaleRepository,
  PrismaContractRepository,
  PrismaBuyerRepository,
  PrismaMarketListingRepository,
  PrismaFarmLookupRepository,
} from './infrastructure/persistence/prisma-finance.repository';
import { FinanceEventService } from './infrastructure/messaging/finance.event.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [ExpenseController, SaleController, ContractController, MarketplaceController, ProfitabilityController],
  providers: [
    FinanceApplicationService,
    ProfitabilityService,
    FinanceEventService,
    { provide: 'ExpenseRepository', useClass: PrismaExpenseRepository },
    { provide: 'SaleRepository', useClass: PrismaSaleRepository },
    { provide: 'ContractRepository', useClass: PrismaContractRepository },
    { provide: 'BuyerRepository', useClass: PrismaBuyerRepository },
    { provide: 'MarketListingRepository', useClass: PrismaMarketListingRepository },
    { provide: 'FarmLookupRepository', useClass: PrismaFarmLookupRepository },
  ],
  exports: [FinanceApplicationService],
})
export class FinanceModule {}
