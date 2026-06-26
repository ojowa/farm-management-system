"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CropRepository = void 0;
const database_1 = require("@farm/database");
class CropRepository {
    // Crop CRUD
    async createCrop(name) {
        return database_1.prisma.crop.create({
            data: { name },
        });
    }
    async getCropById(id) {
        return database_1.prisma.crop.findUnique({
            where: { id },
        });
    }
    async getAllCrops() {
        return database_1.prisma.crop.findMany();
    }
    async updateCrop(id, name) {
        return database_1.prisma.crop.update({
            where: { id },
            data: { name },
        });
    }
    async deleteCrop(id) {
        return database_1.prisma.crop.delete({
            where: { id },
        });
    }
    // CropCycle CRUD
    async createCropCycle(data) {
        return database_1.prisma.cropCycle.create({
            data: {
                fieldId: data.fieldId,
                cropId: data.cropId,
                plantingDate: data.plantingDate,
                harvestDate: data.harvestDate,
            },
            include: {
                crop: true,
                field: true,
            },
        });
    }
    async getCropCycleById(id) {
        return database_1.prisma.cropCycle.findUnique({
            where: { id },
            include: {
                crop: true,
                field: true,
            },
        });
    }
    async getAllCropCycles() {
        return database_1.prisma.cropCycle.findMany({
            include: {
                crop: true,
                field: true,
            },
        });
    }
    async updateCropCycle(id, data) {
        return database_1.prisma.cropCycle.update({
            where: { id },
            data: {
                fieldId: data.fieldId,
                cropId: data.cropId,
                plantingDate: data.plantingDate,
                harvestDate: data.harvestDate,
            },
            include: {
                crop: true,
                field: true,
            },
        });
    }
    async deleteCropCycle(id) {
        return database_1.prisma.cropCycle.delete({
            where: { id },
        });
    }
}
exports.CropRepository = CropRepository;
