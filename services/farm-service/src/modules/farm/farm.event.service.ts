import { emitFarmEvent } from '@farm/utils';

// Farm Service real-time events
export class FarmEventService {
  private static instance: FarmEventService;
  
  private constructor() {}
  
  static getInstance(): FarmEventService {
    if (!FarmEventService.instance) {
      FarmEventService.instance = new FarmEventService();
    }
    return FarmEventService.instance;
  }
  
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
