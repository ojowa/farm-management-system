import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import {
  ExpenseController,
  SaleController,
  ContractController,
  MarketplaceController,
} from './presentation/controllers/finance.controller';
import { ProfitabilityController } from './presentation/controllers/profitability.controller';
import { FinanceApplicationService } from './application/services/finance.service';
import {
  PrismaExpenseRepository,
  PrismaSaleRepository,
  PrismaContractRepository,
  PrismaBuyerRepository,
  PrismaMarketListingRepository,
  PrismaFarmLookupRepository,
} from './infrastructure/persistence/prisma-finance.repository';
import { FinanceEventService } from './infrastructure/messaging/finance.event.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [
    ExpenseController,
    SaleController,
    ContractController,
    MarketplaceController,
    ProfitabilityController,
  ],
  providers: [
    FinanceApplicationService,
    FinanceEventService,
    { provide: 'ExpenseRepository', useClass: PrismaExpenseRepository },
    { provide: 'SaleRepository', useClass: PrismaSaleRepository },
    { provide: 'ContractRepository', useClass: PrismaContractRepository },
    { provide: 'BuyerRepository', useClass: PrismaBuyerRepository },
    { provide: 'MarketListingRepository', useClass: PrismaMarketListingRepository },
    { provide: 'FarmLookupRepository', useClass: PrismaFarmLookupRepository },
  ],
})
export class AppModule {}
