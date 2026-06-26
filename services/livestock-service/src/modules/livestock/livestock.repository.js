"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivestockRepository = void 0;
const database_1 = require("@farm/database");
class LivestockRepository {
    async createLivestock(data) {
        return database_1.prisma.livestock.create({ data });
    }
    async getLivestockById(id) {
        return database_1.prisma.livestock.findUnique({ where: { id } });
    }
    async getAllLivestock() {
        return database_1.prisma.livestock.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async updateLivestock(id, data) {
        return database_1.prisma.livestock.update({ where: { id }, data });
    }
    async deleteLivestock(id) {
        return database_1.prisma.livestock.delete({ where: { id } });
    }
    async getFarmById(id) {
        return database_1.prisma.farm.findUnique({ where: { id } });
    }
}
exports.LivestockRepository = LivestockRepository;
