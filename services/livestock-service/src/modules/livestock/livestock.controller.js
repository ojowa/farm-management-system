"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivestockController = void 0;
const livestock_service_1 = require("./livestock.service");
const validation_1 = require("@farm/validation");
const livestockService = new livestock_service_1.LivestockService();
class LivestockController {
    async createLivestock(req, res) {
        try {
            const validatedData = validation_1.createLivestockSchema.parse(req.body);
            const livestock = await livestockService.createLivestock(validatedData);
            res.status(201).json(livestock);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getLivestockById(req, res) {
        try {
            const id = req.params.id;
            const livestock = await livestockService.getLivestockById(id);
            res.json(livestock);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllLivestock(req, res) {
        try {
            const livestock = await livestockService.getAllLivestock();
            res.json(livestock);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateLivestock(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateLivestockSchema.parse(req.body);
            const livestock = await livestockService.updateLivestock(id, validatedData);
            res.json(livestock);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteLivestock(req, res) {
        try {
            const id = req.params.id;
            await livestockService.deleteLivestock(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
}
exports.LivestockController = LivestockController;
