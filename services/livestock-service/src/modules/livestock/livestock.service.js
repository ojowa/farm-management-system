"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivestockService = void 0;
const livestock_repository_1 = require("./livestock.repository");
class LivestockService {
    repository = new livestock_repository_1.LivestockRepository();
    async assertFarmExists(farmId) {
        const farm = await this.repository.getFarmById(farmId);
        if (!farm) {
            throw new Error(`Farm with ID ${farmId} not found`);
        }
        return farm;
    }
    async createLivestock(data) {
        await this.assertFarmExists(data.farmId);
        const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;
        return this.repository.createLivestock({
            farmId: data.farmId,
            species: data.species,
            breed: data.breed ?? null,
            gender: data.gender,
            birthDate,
            status: data.status,
        });
    }
    async getLivestockById(id) {
        const livestock = await this.repository.getLivestockById(id);
        if (!livestock) {
            throw new Error(`Livestock with ID ${id} not found`);
        }
        return livestock;
    }
    async getAllLivestock() {
        return this.repository.getAllLivestock();
    }
    async updateLivestock(id, data) {
        await this.getLivestockById(id);
        if (data.farmId) {
            await this.assertFarmExists(data.farmId);
        }
        const birthDate = data.birthDate
            ? typeof data.birthDate === 'string'
                ? new Date(data.birthDate)
                : data.birthDate
            : undefined;
        return this.repository.updateLivestock(id, {
            ...data,
            birthDate,
        });
    }
    async deleteLivestock(id) {
        await this.getLivestockById(id);
        return this.repository.deleteLivestock(id);
    }
}
exports.LivestockService = LivestockService;
