"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CropController = void 0;
const crop_service_1 = require("./crop.service");
const validation_1 = require("@farm/validation");
const cropService = new crop_service_1.CropService();
class CropController {
    // Crop Endpoints
    async createCrop(req, res) {
        try {
            const validatedData = validation_1.createCropSchema.parse(req.body);
            const crop = await cropService.createCrop(validatedData);
            res.status(201).json(crop);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getCropById(req, res) {
        try {
            const id = req.params.id;
            const crop = await cropService.getCropById(id);
            res.json(crop);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllCrops(req, res) {
        try {
            const crops = await cropService.getAllCrops();
            res.json(crops);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateCrop(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateCropSchema.parse(req.body);
            const crop = await cropService.updateCrop(id, validatedData);
            res.json(crop);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteCrop(req, res) {
        try {
            const id = req.params.id;
            await cropService.deleteCrop(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // CropCycle Endpoints
    async createCropCycle(req, res) {
        try {
            const validatedData = validation_1.createCropCycleSchema.parse(req.body);
            const cycle = await cropService.createCropCycle(validatedData);
            res.status(201).json(cycle);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getCropCycleById(req, res) {
        try {
            const id = req.params.id;
            const cycle = await cropService.getCropCycleById(id);
            res.json(cycle);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllCropCycles(req, res) {
        try {
            const cycles = await cropService.getAllCropCycles();
            res.json(cycles);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateCropCycle(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateCropCycleSchema.parse(req.body);
            const cycle = await cropService.updateCropCycle(id, validatedData);
            res.json(cycle);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteCropCycle(req, res) {
        try {
            const id = req.params.id;
            await cropService.deleteCropCycle(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
}
exports.CropController = CropController;
