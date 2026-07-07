import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';

@Module({
  controllers: [ShiftsController],
})
export class ShiftsModule {}
