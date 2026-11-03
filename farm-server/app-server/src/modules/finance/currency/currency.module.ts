import { Module } from '@nestjs/common';
import { CurrencyController } from './presentation/controllers/currency.controller';
import { CurrencyApplicationService } from './application/services/currency.service';
import { PrismaCurrencyRepository } from './infrastructure/persistence/prisma-currency.repository';

@Module({
  controllers: [CurrencyController],
  providers: [
    CurrencyApplicationService,
    { provide: 'CurrencyRepository', useClass: PrismaCurrencyRepository },
  ],
  exports: [CurrencyApplicationService],
})
export class CurrencyModule {}
