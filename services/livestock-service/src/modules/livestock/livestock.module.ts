import { Module } from '@nestjs/common';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';
import { LivestockRepository } from './livestock.repository';
import { HealthController } from './health.controller';
import { BreedingController } from './breeding.controller';
import { WeightController } from './weight.controller';

@Module({
  controllers: [LivestockController, HealthController, BreedingController, WeightController],
  providers: [LivestockService, LivestockRepository],
  exports: [LivestockService],
})
export class LivestockModule {}
