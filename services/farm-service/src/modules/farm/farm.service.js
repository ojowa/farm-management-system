"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmService = void 0;
const farm_repository_1 = require("./farm.repository");
class FarmService {
    repository = new farm_repository_1.FarmRepository();
    async createFarm(data) {
        return this.repository.createFarm(data);
    }
    async getFarmById(id) {
        const farm = await this.repository.getFarmById(id);
        if (!farm) {
            throw new Error(`Farm with ID ${id} not found`);
        }
        return farm;
    }
    async getAllFarms() {
        return this.repository.getAllFarms();
    }
    async updateFarm(id, data) {
        await this.getFarmById(id);
        return this.repository.updateFarm(id, data);
    }
    async deleteFarm(id) {
        await this.getFarmById(id);
        return this.repository.deleteFarm(id);
    }
    // --- Field Service Methods ---
    async createField(data) {
        await this.getFarmById(data.farmId);
        return this.repository.createField(data);
    }
    async getFieldById(id) {
        const field = await this.repository.getFieldById(id);
        if (!field) {
            throw new Error(`Field with ID ${id} not found`);
        }
        return field;
    }
    async getAllFields() {
        return this.repository.getAllFields();
    }
    async updateField(id, data) {
        await this.getFieldById(id);
        if (data.farmId) {
            await this.getFarmById(data.farmId);
        }
        return this.repository.updateField(id, data);
    }
    async deleteField(id) {
        await this.getFieldById(id);
        return this.repository.deleteField(id);
    }
}
exports.FarmService = FarmService;
