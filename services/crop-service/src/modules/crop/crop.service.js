"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CropService = void 0;
const crop_repository_1 = require("./crop.repository");
class CropService {
    cropRepository = new crop_repository_1.CropRepository();
    // Crop Business Logic
    async createCrop(data) {
        return this.cropRepository.createCrop(data.name);
    }
    async getCropById(id) {
        const crop = await this.cropRepository.getCropById(id);
        if (!crop) {
            throw new Error(`Crop with ID ${id} not found`);
        }
        return crop;
    }
    async getAllCrops() {
        return this.cropRepository.getAllCrops();
    }
    async updateCrop(id, data) {
        await this.getCropById(id); // Throws if not found
        if (!data.name) {
            throw new Error('Crop name is required for update');
        }
        return this.cropRepository.updateCrop(id, data.name);
    }
    async deleteCrop(id) {
        await this.getCropById(id); // Throws if not found
        return this.cropRepository.deleteCrop(id);
    }
    // CropCycle Business Logic
    async createCropCycle(data) {
        const plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
        const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : null;
        // Check if crop exists
        await this.getCropById(data.cropId);
        return this.cropRepository.createCropCycle({
            fieldId: data.fieldId,
            cropId: data.cropId,
            plantingDate,
            harvestDate,
        });
    }
    async getCropCycleById(id) {
        const cycle = await this.cropRepository.getCropCycleById(id);
        if (!cycle) {
            throw new Error(`Crop cycle with ID ${id} not found`);
        }
        return cycle;
    }
    async getAllCropCycles() {
        return this.cropRepository.getAllCropCycles();
    }
    async updateCropCycle(id, data) {
        await this.getCropCycleById(id); // Throws if not found
        const plantingDate = data.plantingDate ? (typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate) : undefined;
        const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : (data.harvestDate === null ? null : undefined);
        if (data.cropId) {
            await this.getCropById(data.cropId);
        }
        return this.cropRepository.updateCropCycle(id, {
            fieldId: data.fieldId,
            cropId: data.cropId,
            plantingDate,
            harvestDate,
        });
    }
    async deleteCropCycle(id) {
        await this.getCropCycleById(id); // Throws if not found
        return this.cropRepository.deleteCropCycle(id);
    }
}
exports.CropService = CropService;
