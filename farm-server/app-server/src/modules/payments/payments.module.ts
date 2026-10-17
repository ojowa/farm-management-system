import { Module } from '@nestjs/common';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { PlatformPaymentsController } from './presentation/controllers/platform-payments.controller';
import { PaymentsApplicationService } from './application/services/payments.service';

@Module({
  controllers: [PaymentsController, PlatformPaymentsController],
  providers: [PaymentsApplicationService],
  exports: [PaymentsApplicationService],
})
export class PaymentsModule {}
