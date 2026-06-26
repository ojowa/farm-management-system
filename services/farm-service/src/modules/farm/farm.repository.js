"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmRepository = void 0;
const database_1 = require("@farm/database");
class FarmRepository {
    async createFarm(data) {
        return database_1.prisma.farm.create({
            data,
            include: {
                fields: true,
                poultryHouses: true,
            },
        });
    }
    async getFarmById(id) {
        return database_1.prisma.farm.findUnique({
            where: { id },
            include: {
                fields: true,
                poultryHouses: true,
            },
        });
    }
    async getAllFarms() {
        return database_1.prisma.farm.findMany({
            include: {
                fields: true,
                poultryHouses: true,
            },
        });
    }
    async updateFarm(id, data) {
        return database_1.prisma.farm.update({
            where: { id },
            data,
            include: {
                fields: true,
                poultryHouses: true,
            },
        });
    }
    async deleteFarm(id) {
        return database_1.prisma.farm.delete({
            where: { id },
        });
    }
    // --- Field CRUD ---
    async createField(data) {
        return database_1.prisma.field.create({
            data,
            include: { farm: true },
        });
    }
    async getFieldById(id) {
        return database_1.prisma.field.findUnique({
            where: { id },
            include: { farm: true },
        });
    }
    async getAllFields() {
        return database_1.prisma.field.findMany({
            include: { farm: true },
        });
    }
    async updateField(id, data) {
        return database_1.prisma.field.update({
            where: { id },
            data,
            include: { farm: true },
        });
    }
    async deleteField(id) {
        return database_1.prisma.field.delete({
            where: { id },
        });
    }
}
exports.FarmRepository = FarmRepository;
