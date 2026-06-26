"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const inventory_repository_1 = require("./inventory.repository");
class InventoryService {
    repository = new inventory_repository_1.InventoryRepository();
    async assertFarmExists(farmId) {
        const farm = await this.repository.getFarmById(farmId);
        if (!farm) {
            throw new Error(`Farm with ID ${farmId} not found`);
        }
    }
    async createInventoryItem(data) {
        await this.assertFarmExists(data.farmId);
        return this.repository.createInventoryItem({
            farmId: data.farmId,
            name: data.name,
            category: data.category,
            quantity: data.quantity,
            unit: data.unit,
        });
    }
    async getInventoryItemById(id) {
        const item = await this.repository.getInventoryItemById(id);
        if (!item) {
            throw new Error(`Inventory item with ID ${id} not found`);
        }
        return item;
    }
    async getAllInventoryItems() {
        return this.repository.getAllInventoryItems();
    }
    async updateInventoryItem(id, data) {
        await this.getInventoryItemById(id);
        if (data.farmId) {
            await this.assertFarmExists(data.farmId);
        }
        return this.repository.updateInventoryItem(id, data);
    }
    async deleteInventoryItem(id) {
        await this.getInventoryItemById(id);
        return this.repository.deleteInventoryItem(id);
    }
}
exports.InventoryService = InventoryService;
