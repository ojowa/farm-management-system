import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ReportingService } from './reporting.service';

@Module({
  controllers: [ReportsController, ScheduledReportsController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
