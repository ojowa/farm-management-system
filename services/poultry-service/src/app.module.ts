import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import {
  PoultryHousesController,
  PensController,
  BreedsController,
  FlocksController,
  FeedingRecordsController,
  VaccinationRecordsController,
  MortalityRecordsController,
  MedicationsController,
} from './presentation/controllers/poultry.controller';
import { PoultryApplicationService } from './application/services/poultry.service';
import {
  PrismaPoultryHouseRepository,
  PrismaPenRepository,
  PrismaBreedRepository,
  PrismaFlockRepository,
  PrismaFeedingRecordRepository,
  PrismaVaccinationRecordRepository,
  PrismaMortalityRecordRepository,
  PrismaMedicationRepository,
} from './infrastructure/persistence/prisma-poultry.repository';
import { PoultryEventService } from './infrastructure/messaging/poultry.event.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [
    PoultryHousesController,
    PensController,
    BreedsController,
    FlocksController,
    FeedingRecordsController,
    VaccinationRecordsController,
    MortalityRecordsController,
    MedicationsController,
  ],
  providers: [
    PoultryApplicationService,
    PoultryEventService,
    { provide: 'PoultryHouseRepository', useClass: PrismaPoultryHouseRepository },
    { provide: 'PenRepository', useClass: PrismaPenRepository },
    { provide: 'BreedRepository', useClass: PrismaBreedRepository },
    { provide: 'FlockRepository', useClass: PrismaFlockRepository },
    { provide: 'FeedingRecordRepository', useClass: PrismaFeedingRecordRepository },
    { provide: 'VaccinationRecordRepository', useClass: PrismaVaccinationRecordRepository },
    { provide: 'MortalityRecordRepository', useClass: PrismaMortalityRecordRepository },
    { provide: 'MedicationRepository', useClass: PrismaMedicationRepository },
  ],
})
export class AppModule {}
