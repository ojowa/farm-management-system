import { Module } from '@nestjs/common';
import { PoultryService } from './poultry.service';
import { MedicationService } from './medication.service';
import { PoultryRepository } from './poultry.repository';
import { MedicationRepository } from './medication.repository';
import { PoultryHousesController } from './poultry-houses.controller';
import { PensController } from './pens.controller';
import { BreedsController } from './breeds.controller';
import { FlocksController } from './flocks.controller';
import { FeedingRecordsController } from './feeding-records.controller';
import { VaccinationRecordsController } from './vaccination-records.controller';
import { MortalityRecordsController } from './mortality-records.controller';
import { MedicationsController } from './medications.controller';

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
  providers: [PoultryService, MedicationService, PoultryRepository, MedicationRepository],
  exports: [PoultryService, MedicationService],
})
export class PoultryModule {}
