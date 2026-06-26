import { InventoryRepository } from './inventory.repository';
import { CreateInventoryItemRequest, UpdateInventoryItemRequest } from '@farm/types';

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
    return this.repository.createInventoryItem({
      farmId: data.farmId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
    });
  }

  async getInventoryItemById(id: string) {
    const item = await this.repository.getInventoryItemById(id);
    if (!item) {
      throw new Error(`Inventory item with ID ${id} not found`);
    }
    return item;
  }

  async getAllInventoryItems() {
    return this.repository.getAllInventoryItems();
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemRequest) {
    await this.getInventoryItemById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    return this.repository.updateInventoryItem(id, data);
  }

  async deleteInventoryItem(id: string) {
    await this.getInventoryItemById(id);
    return this.repository.deleteInventoryItem(id);
  }
}

