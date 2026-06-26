"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const worker_repository_1 = require("./worker.repository");
class WorkerService {
    repository = new worker_repository_1.WorkerRepository();
    async createWorker(data) {
        return this.repository.createWorker(data);
    }
    async getWorkerById(id) {
        const worker = await this.repository.getWorkerById(id);
        if (!worker) {
            throw new Error(`Worker with ID ${id} not found`);
        }
        return worker;
    }
    async getAllWorkers() {
        return this.repository.getAllWorkers();
    }
    async updateWorker(id, data) {
        await this.getWorkerById(id);
        return this.repository.updateWorker(id, data);
    }
    async deleteWorker(id) {
        await this.getWorkerById(id);
        return this.repository.deleteWorker(id);
    }
}
exports.WorkerService = WorkerService;
