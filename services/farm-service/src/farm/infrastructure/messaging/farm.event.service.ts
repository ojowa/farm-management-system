import { Injectable } from '@nestjs/common';
import { emitFarmEvent } from '@farm/utils';
import { Farm } from '../../domain/entities/farm.entity';

@Injectable()
export class FarmEventService {
  async emitFarmCreatedEvent(farm: Farm) {
    await emitFarmEvent('created', farm);
  }

  async emitFarmUpdatedEvent(farm: Farm) {
    await emitFarmEvent('updated', farm);
  }

  async emitFarmDeletedEvent(farmId: string) {
    await emitFarmEvent('deleted', { id: farmId });
  }
}
