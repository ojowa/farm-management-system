import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

// ── Farm ──
import { FarmController, FieldController } from './farm/presentation/controllers/farm.controller';
import { FarmApplicationService } from './farm/application/services/farm.service';
import { PrismaFarmRepository, PrismaFieldRepository } from './farm/infrastructure/persistence/prisma-farm.repository';
import { FarmEventService } from './farm/infrastructure/messaging/farm.event.service';

// ── Crop ──
import { CropController, CropCycleController } from './crop/presentation/controllers/crop.controller';
import { CropApplicationService } from './crop/application/services/crop.service';
import { PrismaCropRepository, PrismaCropCycleRepository } from './crop/infrastructure/persistence/prisma-crop.repository';
import { CropEventService } from './crop/infrastructure/messaging/crop.event.service';

// ── Livestock ──
import {
  LivestockController,
  HealthController,
  BreedingController,
  WeightController,
} from './livestock/presentation/controllers/livestock.controller';
import { LivestockApplicationService } from './livestock/application/services/livestock.service';
import {
  PrismaLivestockRepository,
  PrismaHealthRecordRepository,
  PrismaBreedingRecordRepository,
  PrismaWeightRecordRepository,
  PrismaVaccinationScheduleRepository,
} from './livestock/infrastructure/persistence/prisma-livestock.repository';
import { LivestockEventService } from './livestock/infrastructure/messaging/livestock.event.service';

// ── Poultry ──
import {
  PoultryHousesController,
  PensController,
  BreedsController,
  FlocksController,
  FeedingRecordsController,
  VaccinationRecordsController,
  MortalityRecordsController,
  MedicationsController,
} from './poultry/presentation/controllers/poultry.controller';
import { PoultryApplicationService } from './poultry/application/services/poultry.service';
import { PrismaPoultryRepository } from './poultry/infrastructure/persistence/prisma-poultry.repository';
import { PoultryEventService } from './poultry/infrastructure/messaging/poultry.event.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '..', '.env') }),
  ],
  controllers: [
    FarmController,
    FieldController,
    CropController,
    CropCycleController,
    LivestockController,
    HealthController,
    BreedingController,
    WeightController,
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
    FarmApplicationService,
    FarmEventService,
    { provide: 'FarmRepository', useClass: PrismaFarmRepository },
    { provide: 'FieldRepository', useClass: PrismaFieldRepository },
    CropApplicationService,
    CropEventService,
    { provide: 'CropRepository', useClass: PrismaCropRepository },
    { provide: 'CropCycleRepository', useClass: PrismaCropCycleRepository },
    LivestockApplicationService,
    LivestockEventService,
    { provide: 'LivestockRepository', useClass: PrismaLivestockRepository },
    { provide: 'HealthRecordRepository', useClass: PrismaHealthRecordRepository },
    { provide: 'BreedingRecordRepository', useClass: PrismaBreedingRecordRepository },
    { provide: 'WeightRecordRepository', useClass: PrismaWeightRecordRepository },
    { provide: 'VaccinationScheduleRepository', useClass: PrismaVaccinationScheduleRepository },
    PoultryApplicationService,
    PoultryEventService,
    { provide: 'PoultryRepository', useClass: PrismaPoultryRepository },
  ],
})
export class AppModule {}
