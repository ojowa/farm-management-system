import { Injectable } from '@nestjs/common';
import { emitCropEvent } from '@farm/utils';
import { Crop, CropCycle } from '../../domain/entities/crop.entity';

@Injectable()
export class CropEventService {
  async emitCropCreatedEvent(crop: Crop) {
    await emitCropEvent('created', crop);
  }

  async emitCropUpdatedEvent(crop: Crop) {
    await emitCropEvent('updated', crop);
  }

  async emitCropDeletedEvent(cropId: string) {
    await emitCropEvent('deleted', { id: cropId });
  }

  async emitCropCycleCreatedEvent(cycle: CropCycle) {
    await emitCropEvent('created', cycle);
  }

  async emitCropCycleUpdatedEvent(cycle: CropCycle) {
    await emitCropEvent('updated', cycle);
  }

  async emitCropCycleDeletedEvent(cycleId: string) {
    await emitCropEvent('deleted', { id: cycleId });
  }
}
