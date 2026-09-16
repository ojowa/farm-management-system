import { Module } from '@nestjs/common';
import { CropController, CropCycleController, CropLifecycleController } from './presentation/controllers/crop.controller';
import { CropApplicationService } from './application/services/crop.service';
import { PrismaCropRepository, PrismaCropCycleRepository } from './infrastructure/persistence/prisma-crop.repository';
import { CropEventService } from './infrastructure/messaging/crop.event.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [CropController, CropCycleController, CropLifecycleController],
  providers: [
    CropApplicationService,
    CropEventService,
    { provide: 'CropRepository', useClass: PrismaCropRepository },
    { provide: 'CropCycleRepository', useClass: PrismaCropCycleRepository },
  ],
  exports: [CropApplicationService],
})
export class CropModule {}
