import { InventoryRepository } from './inventory.repository';
import { CreateInventoryItemRequest, UpdateInventoryItemRequest } from '@farm/types';
import { emitInventoryEvent } from '@farm/utils';

export class InventoryService {
  private repository = new InventoryRepository();

  private async assertFarmExists(farmId: string) {
    const farm = await this.repository.getFarmById(farmId);
    if (!farm) {
      throw new Error(`Farm with ID ${farmId} not found`);
    }
  }

  async createInventoryItem(data: CreateInventoryItemRequest) {
    await this.assertFarmExists(data.farmId);
    const item = await this.repository.createInventoryItem({
      farmId: data.farmId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
    });
    await emitInventoryEvent('created', item);
    return item;
  }

  async getInventoryItemById(id: string) {
    const item = await this.repository.getInventoryItemById(id);
    if (!item) {
      throw new Error(`Inventory item with ID ${id} not found`);
    }
    return item;
  }

  async getAllInventoryItems(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 10) {
    return this.repository.getAllInventoryItems(filter, sortBy, sortOrder, page, limit);
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemRequest) {
    await this.getInventoryItemById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    const item = await this.repository.updateInventoryItem(id, data);
    await emitInventoryEvent('updated', item);
    return item;
  }

  async deleteInventoryItem(id: string) {
    await this.getInventoryItemById(id);
    await this.repository.deleteInventoryItem(id);
    await emitInventoryEvent('deleted', { id });
    return { deleted: true };
  }
}

