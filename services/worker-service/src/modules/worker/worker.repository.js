"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerRepository = void 0;
const database_1 = require("@farm/database");
class WorkerRepository {
    async createWorker(data) {
        return database_1.prisma.worker.create({ data });
    }
    async getWorkerById(id) {
        return database_1.prisma.worker.findUnique({ where: { id } });
    }
    async getAllWorkers() {
        return database_1.prisma.worker.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async updateWorker(id, data) {
        return database_1.prisma.worker.update({ where: { id }, data });
    }
    async deleteWorker(id) {
        return database_1.prisma.worker.delete({ where: { id } });
    }
}
exports.WorkerRepository = WorkerRepository;
