import { Module } from '@nestjs/common';
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
import { PrismaPoultryRepository } from './infrastructure/persistence/prisma-poultry.repository';
import { PoultryEventService } from './infrastructure/messaging/poultry.event.service';

@Module({
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
    { provide: 'PoultryRepository', useClass: PrismaPoultryRepository },
  ],
  exports: [PoultryApplicationService],
})
export class PoultryModule {}
