"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerController = void 0;
const worker_service_1 = require("./worker.service");
const validation_1 = require("@farm/validation");
const workerService = new worker_service_1.WorkerService();
class WorkerController {
    async createWorker(req, res) {
        try {
            const validatedData = validation_1.createWorkerSchema.parse(req.body);
            const worker = await workerService.createWorker(validatedData);
            res.status(201).json(worker);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getWorkerById(req, res) {
        try {
            const id = req.params.id;
            const worker = await workerService.getWorkerById(id);
            res.json(worker);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllWorkers(req, res) {
        try {
            const workers = await workerService.getAllWorkers();
            res.json(workers);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateWorker(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateWorkerSchema.parse(req.body);
            const worker = await workerService.updateWorker(id, validatedData);
            res.json(worker);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteWorker(req, res) {
        try {
            const id = req.params.id;
            await workerService.deleteWorker(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
}
exports.WorkerController = WorkerController;
