import { Module } from '@nestjs/common';
import { LeaveBalanceController } from './leavebalance.controller';

@Module({
  controllers: [LeaveBalanceController],
})
export class LeaveBalanceModule {}
