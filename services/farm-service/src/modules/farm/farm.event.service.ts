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
    const payload = {
      entity: 'farm' as const,
      action: 'created' as const,
      data: farm,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitFarmUpdatedEvent(farm: any): Promise<void> {
    const payload = {
      entity: 'farm' as const,
      action: 'updated' as const,
      data: farm,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitFarmDeletedEvent(farmId: string): Promise<void> {
    const payload = {
      entity: 'farm' as const,
      action: 'deleted' as const,
      data: { id: farmId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    // Send event to shared gateway for WebSocket emission
    // This will be connected to a shared Socket.IO gateway
    try {
      // This would integrate with a shared gateway service
      console.log(` Farm event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit farm event:', error);
    }
  }
}

// Crop Service real-time events
export class CropEventService {
  private static instance: CropEventService;
  
  private constructor() {}
  
  static getInstance(): CropEventService {
    if (!CropEventService.instance) {
      CropEventService.instance = new CropEventService();
    }
    return CropEventService.instance;
  }
  
  async emitCropCreatedEvent(crop: any): Promise<void> {
    const payload = {
      entity: 'crop' as const,
      action: 'created' as const,
      data: crop,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitCropUpdatedEvent(crop: any): Promise<void> {
    const payload = {
      entity: 'crop' as const,
      action: 'updated' as const,
      data: crop,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitCropDeletedEvent(cropId: string): Promise<void> {
    const payload = {
      entity: 'crop' as const,
      action: 'deleted' as const,
      data: { id: cropId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    try {
      console.log(` Crop event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit crop event:', error);
    }
  }
}

// Livestock Service real-time events
export class LivestockEventService {
  private static instance: LivestockEventService;
  
  private constructor() {}
  
  static getInstance(): LivestockEventService {
    if (!LivestockEventService.instance) {
      LivestockEventService.instance = new LivestockEventService();
    }
    return LivestockEventService.instance;
  }
  
  async emitLivestockCreatedEvent(livestock: any): Promise<void> {
    const payload = {
      entity: 'livestock' as const,
      action: 'created' as const,
      data: livestock,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitLivestockUpdatedEvent(livestock: any): Promise<void> {
    const payload = {
      entity: 'livestock' as const,
      action: 'updated' as const,
      data: livestock,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitLivestockDeletedEvent(livestockId: string): Promise<void> {
    const payload = {
      entity: 'livestock' as const,
      action: 'deleted' as const,
      data: { id: livestockId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    try {
      console.log(` Livestock event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit livestock event:', error);
    }
  }
}

// Poultry Service real-time events
export class PoultryEventService {
  private static instance: PoultryEventService;
  
  private constructor() {}
  
  static getInstance(): PoultryEventService {
    if (!PoultryEventService.instance) {
      PoultryEventService.instance = new PoultryEventService();
    }
    return PoultryEventService.instance;
  }
  
  async emitFlockCreatedEvent(flock: any): Promise<void> {
    const payload = {
      entity: 'poultry' as const,
      action: 'created' as const,
      data: flock,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitFlockUpdatedEvent(flock: any): Promise<void> {
    const payload = {
      entity: 'poultry' as const,
      action: 'updated' as const,
      data: flock,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitFlockDeletedEvent(flockId: string): Promise<void> {
    const payload = {
      entity: 'poultry' as const,
      action: 'deleted' as const,
      data: { id: flockId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    try {
      console.log(` Poultry event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit poultry event:', error);
    }
  }
}

// Inventory Service real-time events
export class InventoryEventService {
  private static instance: InventoryEventService;
  
  private constructor() {}
  
  static getInstance(): InventoryEventService {
    if (!InventoryEventService.instance) {
      InventoryEventService.instance = new InventoryEventService();
    }
    return InventoryEventService.instance;
  }
  
  async emitInventoryItemCreatedEvent(item: any): Promise<void> {
    const payload = {
      entity: 'inventory' as const,
      action: 'created' as const,
      data: item,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitInventoryItemUpdatedEvent(item: any): Promise<void> {
    const payload = {
      entity: 'inventory' as const,
      action: 'updated' as const,
      data: item,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitInventoryItemDeletedEvent(itemId: string): Promise<void> {
    const payload = {
      entity: 'inventory' as const,
      action: 'deleted' as const,
      data: { id: itemId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    try {
      console.log(` Inventory event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit inventory event:', error);
    }
  }
}

// Finance Service real-time events
export class FinanceEventService {
  private static instance: FinanceEventService;
  
  private constructor() {}
  
  static getInstance(): FinanceEventService {
    if (!FinanceEventService.instance) {
      FinanceEventService.instance = new FinanceEventService();
    }
    return FinanceEventService.instance;
  }
  
  async emitTransactionCreatedEvent(transaction: any): Promise<void> {
    const payload = {
      entity: 'finance' as const,
      action: 'created' as const,
      data: transaction,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitTransactionUpdatedEvent(transaction: any): Promise<void> {
    const payload = {
      entity: 'finance' as const,
      action: 'updated' as const,
      data: transaction,
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  async emitTransactionDeletedEvent(transactionId: string): Promise<void> {
    const payload = {
      entity: 'finance' as const,
      action: 'deleted' as const,
      data: { id: transactionId },
      timestamp: new Date().toISOString(),
    };
    await this.sendToGateway(payload);
  }
  
  private async sendToGateway(payload: any): Promise<void> {
    try {
      console.log(` Finance event emitted: ${payload.entity}.${payload.action} for ID ${payload.data.id || 'N/A'}`);
    } catch (error) {
      console.error('Failed to emit finance event:', error);
    }
  }
}
