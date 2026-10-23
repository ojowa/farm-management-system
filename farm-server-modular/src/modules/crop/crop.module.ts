import { Module } from '@nestjs/common';
import { CropController, CropCycleController, CropLifecycleController } from './presentation/controllers/crop.controller';
import { IrrigationController, PestDiseaseController, YieldController } from './presentation/controllers/crop-operations.controller';
import { CropApplicationService } from './application/services/crop.service';
import { PrismaCropRepository, PrismaCropCycleRepository } from './infrastructure/persistence/prisma-crop.repository';
import { CropEventService } from './infrastructure/messaging/crop.event.service';
import { RealtimeModule } from '../realtime';

@Module({
  imports: [RealtimeModule],
  controllers: [
    CropController,
    CropCycleController,
    CropLifecycleController,
    IrrigationController,
    PestDiseaseController,
    YieldController,
  ],
  providers: [
    CropApplicationService,
    CropEventService,
    { provide: 'CropRepository', useClass: PrismaCropRepository },
    { provide: 'CropCycleRepository', useClass: PrismaCropCycleRepository },
  ],
  exports: [CropApplicationService],
})
export class CropModule {}
