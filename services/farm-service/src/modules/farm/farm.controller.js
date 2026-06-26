"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmController = void 0;
const farm_service_1 = require("./farm.service");
const validation_1 = require("@farm/validation");
const farmService = new farm_service_1.FarmService();
class FarmController {
    async createFarm(req, res) {
        try {
            const validatedData = validation_1.createFarmSchema.parse(req.body);
            const farm = await farmService.createFarm(validatedData);
            res.status(201).json(farm);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getFarmById(req, res) {
        try {
            const id = req.params.id;
            const farm = await farmService.getFarmById(id);
            res.json(farm);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllFarms(req, res) {
        try {
            const farms = await farmService.getAllFarms();
            res.json(farms);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateFarm(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateFarmSchema.parse(req.body);
            const farm = await farmService.updateFarm(id, validatedData);
            res.json(farm);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteFarm(req, res) {
        try {
            const id = req.params.id;
            await farmService.deleteFarm(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // Field endpoints
    async createField(req, res) {
        try {
            const validatedData = validation_1.createFieldSchema.parse(req.body);
            const field = await farmService.createField(validatedData);
            res.status(201).json(field);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getFieldById(req, res) {
        try {
            const id = req.params.id;
            const field = await farmService.getFieldById(id);
            res.json(field);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllFields(req, res) {
        try {
            const fields = await farmService.getAllFields();
            res.json(fields);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateField(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateFieldSchema.parse(req.body);
            const field = await farmService.updateField(id, validatedData);
            res.json(field);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteField(req, res) {
        try {
            const id = req.params.id;
            await farmService.deleteField(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
}
exports.FarmController = FarmController;
