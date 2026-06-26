"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryRepository = void 0;
const database_1 = require("@farm/database");
class InventoryRepository {
    async createInventoryItem(data) {
        return database_1.prisma.inventory.create({ data });
    }
    async getInventoryItemById(id) {
        return database_1.prisma.inventory.findUnique({ where: { id } });
    }
    async getAllInventoryItems() {
        return database_1.prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async updateInventoryItem(id, data) {
        return database_1.prisma.inventory.update({ where: { id }, data });
    }
    async deleteInventoryItem(id) {
        return database_1.prisma.inventory.delete({ where: { id } });
    }
    async getFarmById(id) {
        return database_1.prisma.farm.findUnique({ where: { id } });
    }
}
exports.InventoryRepository = InventoryRepository;
