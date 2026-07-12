import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ReportController, ScheduledReportController } from './presentation/controllers/report.controller';
import { ReportApplicationService } from './application/services/report.service';
import { PrismaReportRepository, PrismaScheduledReportRepository } from './infrastructure/persistence/prisma-report.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [ReportController, ScheduledReportController],
  providers: [
    ReportApplicationService,
    { provide: 'ReportRepository', useClass: PrismaReportRepository },
    { provide: 'ScheduledReportRepository', useClass: PrismaScheduledReportRepository },
  ],
})
export class AppModule {}
