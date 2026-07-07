import { Module } from '@nestjs/common';
import { LeaveTypesController } from './leavetypes.controller';

@Module({
  controllers: [LeaveTypesController],
})
export class LeaveTypesModule {}
