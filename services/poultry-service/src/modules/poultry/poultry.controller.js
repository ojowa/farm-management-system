"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoultryController = void 0;
const poultry_service_1 = require("./poultry.service");
const validation_1 = require("@farm/validation");
const poultryService = new poultry_service_1.PoultryService();
class PoultryController {
    // PoultryHouse endpoints
    async createPoultryHouse(req, res) {
        try {
            const validatedData = validation_1.createPoultryHouseSchema.parse(req.body);
            const house = await poultryService.createPoultryHouse(validatedData);
            res.status(201).json(house);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getPoultryHouseById(req, res) {
        try {
            const id = req.params.id;
            const house = await poultryService.getPoultryHouseById(id);
            res.json(house);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllPoultryHouses(req, res) {
        try {
            const houses = await poultryService.getAllPoultryHouses();
            res.json(houses);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updatePoultryHouse(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updatePoultryHouseSchema.parse(req.body);
            const house = await poultryService.updatePoultryHouse(id, validatedData);
            res.json(house);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deletePoultryHouse(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deletePoultryHouse(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // Pen endpoints
    async createPen(req, res) {
        try {
            const validatedData = validation_1.createPenSchema.parse(req.body);
            const pen = await poultryService.createPen(validatedData);
            res.status(201).json(pen);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getPenById(req, res) {
        try {
            const id = req.params.id;
            const pen = await poultryService.getPenById(id);
            res.json(pen);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllPens(req, res) {
        try {
            const pens = await poultryService.getAllPens();
            res.json(pens);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updatePen(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updatePenSchema.parse(req.body);
            const pen = await poultryService.updatePen(id, validatedData);
            res.json(pen);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deletePen(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deletePen(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // Breed endpoints
    async createBreed(req, res) {
        try {
            const validatedData = validation_1.createBreedSchema.parse(req.body);
            const breed = await poultryService.createBreed(validatedData);
            res.status(201).json(breed);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getBreedById(req, res) {
        try {
            const id = req.params.id;
            const breed = await poultryService.getBreedById(id);
            res.json(breed);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllBreeds(req, res) {
        try {
            const breeds = await poultryService.getAllBreeds();
            res.json(breeds);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateBreed(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateBreedSchema.parse(req.body);
            const breed = await poultryService.updateBreed(id, validatedData);
            res.json(breed);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteBreed(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deleteBreed(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // Flock endpoints
    async createFlock(req, res) {
        try {
            const validatedData = validation_1.createFlockSchema.parse(req.body);
            const flock = await poultryService.createFlock(validatedData);
            res.status(201).json(flock);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getFlockById(req, res) {
        try {
            const id = req.params.id;
            const flock = await poultryService.getFlockById(id);
            res.json(flock);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllFlocks(req, res) {
        try {
            const flocks = await poultryService.getAllFlocks();
            res.json(flocks);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateFlock(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateFlockSchema.parse(req.body);
            const flock = await poultryService.updateFlock(id, validatedData);
            res.json(flock);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteFlock(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deleteFlock(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // FeedingRecord endpoints
    async createFeedingRecord(req, res) {
        try {
            const validatedData = validation_1.createFeedingRecordSchema.parse(req.body);
            const record = await poultryService.createFeedingRecord(validatedData);
            res.status(201).json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getFeedingRecordById(req, res) {
        try {
            const id = req.params.id;
            const record = await poultryService.getFeedingRecordById(id);
            res.json(record);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllFeedingRecords(req, res) {
        try {
            const records = await poultryService.getAllFeedingRecords();
            res.json(records);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateFeedingRecord(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateFeedingRecordSchema.parse(req.body);
            const record = await poultryService.updateFeedingRecord(id, validatedData);
            res.json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteFeedingRecord(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deleteFeedingRecord(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // VaccinationRecord endpoints
    async createVaccinationRecord(req, res) {
        try {
            const validatedData = validation_1.createVaccinationRecordSchema.parse(req.body);
            const record = await poultryService.createVaccinationRecord(validatedData);
            res.status(201).json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getVaccinationRecordById(req, res) {
        try {
            const id = req.params.id;
            const record = await poultryService.getVaccinationRecordById(id);
            res.json(record);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllVaccinationRecords(req, res) {
        try {
            const records = await poultryService.getAllVaccinationRecords();
            res.json(records);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateVaccinationRecord(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateVaccinationRecordSchema.parse(req.body);
            const record = await poultryService.updateVaccinationRecord(id, validatedData);
            res.json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteVaccinationRecord(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deleteVaccinationRecord(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    // MortalityRecord endpoints
    async createMortalityRecord(req, res) {
        try {
            const validatedData = validation_1.createMortalityRecordSchema.parse(req.body);
            const record = await poultryService.createMortalityRecord(validatedData);
            res.status(201).json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getMortalityRecordById(req, res) {
        try {
            const id = req.params.id;
            const record = await poultryService.getMortalityRecordById(id);
            res.json(record);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllMortalityRecords(req, res) {
        try {
            const records = await poultryService.getAllMortalityRecords();
            res.json(records);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateMortalityRecord(req, res) {
        try {
            const id = req.params.id;
            const validatedData = validation_1.updateMortalityRecordSchema.parse(req.body);
            const record = await poultryService.updateMortalityRecord(id, validatedData);
            res.json(record);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteMortalityRecord(req, res) {
        try {
            const id = req.params.id;
            await poultryService.deleteMortalityRecord(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
}
exports.PoultryController = PoultryController;
