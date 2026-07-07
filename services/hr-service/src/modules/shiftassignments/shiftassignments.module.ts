import { Module } from '@nestjs/common';
import { ShiftAssignmentsController } from './shiftassignments.controller';

@Module({
  controllers: [ShiftAssignmentsController],
})
export class ShiftAssignmentsModule {}
