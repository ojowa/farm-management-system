import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
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
})
export class AppModule {}
