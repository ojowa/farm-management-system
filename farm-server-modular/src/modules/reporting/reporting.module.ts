import { Module } from '@nestjs/common';
import { ReportController, ScheduledReportController } from './presentation/controllers/report.controller';
import { ReportApplicationService } from './application/services/report.service';
import { PrismaReportRepository, PrismaScheduledReportRepository } from './infrastructure/persistence/prisma-report.repository';

@Module({
  controllers: [ReportController, ScheduledReportController],
  providers: [
    ReportApplicationService,
    { provide: 'ReportRepository', useClass: PrismaReportRepository },
    { provide: 'ScheduledReportRepository', useClass: PrismaScheduledReportRepository },
  ],
  exports: [ReportApplicationService],
})
export class ReportingModule {}
