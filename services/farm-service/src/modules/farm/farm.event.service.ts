import { Injectable } from '@nestjs/common';
import { emitFarmEvent } from '@farm/utils';

@Injectable()
export class FarmEventService {
  async emitFarmCreatedEvent(farm: any): Promise<void> {
    await emitFarmEvent('created', farm);
  }

  async emitFarmUpdatedEvent(farm: any): Promise<void> {
    await emitFarmEvent('updated', farm);
  }

  async emitFarmDeletedEvent(farmId: string): Promise<void> {
    await emitFarmEvent('deleted', { id: farmId });
  }
}
