import { Module } from '@nestjs/common';
import {
  LivestockController,
  HealthController,
  BreedingController,
  WeightController,
} from './presentation/controllers/livestock.controller';
import { LivestockApplicationService } from './application/services/livestock.service';
import {
  PrismaLivestockRepository,
  PrismaHealthRecordRepository,
  PrismaBreedingRecordRepository,
  PrismaWeightRecordRepository,
  PrismaVaccinationScheduleRepository,
} from './infrastructure/persistence/prisma-livestock.repository';
import { LivestockEventService } from './infrastructure/messaging/livestock.event.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [LivestockController, HealthController, BreedingController, WeightController],
  providers: [
    LivestockApplicationService,
    LivestockEventService,
    { provide: 'LivestockRepository', useClass: PrismaLivestockRepository },
    { provide: 'HealthRecordRepository', useClass: PrismaHealthRecordRepository },
    { provide: 'BreedingRecordRepository', useClass: PrismaBreedingRecordRepository },
    { provide: 'WeightRecordRepository', useClass: PrismaWeightRecordRepository },
    { provide: 'VaccinationScheduleRepository', useClass: PrismaVaccinationScheduleRepository },
  ],
  exports: [LivestockApplicationService],
})
export class LivestockModule {}
