import { Module } from '@nestjs/common';
import { LeaveRequestsController } from './leaverequests.controller';

@Module({
  controllers: [LeaveRequestsController],
})
export class LeaveRequestsModule {}
