import { Module } from '@nestjs/common';
import { CropController } from './crop.controller';
import { LifecycleController } from './lifecycle.controller';
import { IrrigationController } from './irrigation.controller';
import { PestDiseaseController } from './pest-disease.controller';
import { YieldController } from './yield.controller';
import { CropService } from './crop.service';
import { CropRepository } from './crop.repository';

@Module({
  controllers: [CropController, LifecycleController, IrrigationController, PestDiseaseController, YieldController],
  providers: [CropService, CropRepository],
  exports: [CropService],
})
export class CropModule {}
