"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoultryService = void 0;
const poultry_repository_1 = require("./poultry.repository");
class PoultryService {
    repository = new poultry_repository_1.PoultryRepository();
    // --- PoultryHouse Service Methods ---
    async createPoultryHouse(data) {
        return this.repository.createPoultryHouse(data);
    }
    async getPoultryHouseById(id) {
        const house = await this.repository.getPoultryHouseById(id);
        if (!house) {
            throw new Error(`PoultryHouse with ID ${id} not found`);
        }
        return house;
    }
    async getAllPoultryHouses() {
        return this.repository.getAllPoultryHouses();
    }
    async updatePoultryHouse(id, data) {
        await this.getPoultryHouseById(id);
        return this.repository.updatePoultryHouse(id, data);
    }
    async deletePoultryHouse(id) {
        await this.getPoultryHouseById(id);
        return this.repository.deletePoultryHouse(id);
    }
    // --- Pen Service Methods ---
    async createPen(data) {
        // Validate PoultryHouse exists
        await this.getPoultryHouseById(data.poultryHouseId);
        return this.repository.createPen(data);
    }
    async getPenById(id) {
        const pen = await this.repository.getPenById(id);
        if (!pen) {
            throw new Error(`Pen with ID ${id} not found`);
        }
        return pen;
    }
    async getAllPens() {
        return this.repository.getAllPens();
    }
    async updatePen(id, data) {
        await this.getPenById(id);
        if (data.poultryHouseId) {
            await this.getPoultryHouseById(data.poultryHouseId);
        }
        return this.repository.updatePen(id, data);
    }
    async deletePen(id) {
        await this.getPenById(id);
        return this.repository.deletePen(id);
    }
    // --- Breed Service Methods ---
    async createBreed(data) {
        return this.repository.createBreed(data);
    }
    async getBreedById(id) {
        const breed = await this.repository.getBreedById(id);
        if (!breed) {
            throw new Error(`Breed with ID ${id} not found`);
        }
        return breed;
    }
    async getAllBreeds() {
        return this.repository.getAllBreeds();
    }
    async updateBreed(id, data) {
        await this.getBreedById(id);
        return this.repository.updateBreed(id, data);
    }
    async deleteBreed(id) {
        await this.getBreedById(id);
        return this.repository.deleteBreed(id);
    }
    // --- Flock Service Methods ---
    async createFlock(data) {
        // Validate relations
        await this.getPenById(data.penId);
        await this.getBreedById(data.breedId);
        const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;
        return this.repository.createFlock({
            ...data,
            arrivalDate,
        });
    }
    async getFlockById(id) {
        const flock = await this.repository.getFlockById(id);
        if (!flock) {
            throw new Error(`Flock with ID ${id} not found`);
        }
        return flock;
    }
    async getAllFlocks() {
        return this.repository.getAllFlocks();
    }
    async updateFlock(id, data) {
        await this.getFlockById(id);
        if (data.penId) {
            await this.getPenById(data.penId);
        }
        if (data.breedId) {
            await this.getBreedById(data.breedId);
        }
        const arrivalDate = data.arrivalDate ? (typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate) : undefined;
        return this.repository.updateFlock(id, {
            ...data,
            arrivalDate,
        });
    }
    async deleteFlock(id) {
        await this.getFlockById(id);
        return this.repository.deleteFlock(id);
    }
    // --- FeedingRecord Service Methods ---
    async createFeedingRecord(data) {
        await this.getFlockById(data.flockId);
        const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
        return this.repository.createFeedingRecord({
            ...data,
            date,
        });
    }
    async getFeedingRecordById(id) {
        const record = await this.repository.getFeedingRecordById(id);
        if (!record) {
            throw new Error(`Feeding record with ID ${id} not found`);
        }
        return record;
    }
    async getAllFeedingRecords() {
        return this.repository.getAllFeedingRecords();
    }
    async updateFeedingRecord(id, data) {
        await this.getFeedingRecordById(id);
        if (data.flockId) {
            await this.getFlockById(data.flockId);
        }
        const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
        return this.repository.updateFeedingRecord(id, {
            ...data,
            date,
        });
    }
    async deleteFeedingRecord(id) {
        await this.getFeedingRecordById(id);
        return this.repository.deleteFeedingRecord(id);
    }
    // --- VaccinationRecord Service Methods ---
    async createVaccinationRecord(data) {
        await this.getFlockById(data.flockId);
        const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
        return this.repository.createVaccinationRecord({
            ...data,
            date,
        });
    }
    async getVaccinationRecordById(id) {
        const record = await this.repository.getVaccinationRecordById(id);
        if (!record) {
            throw new Error(`Vaccination record with ID ${id} not found`);
        }
        return record;
    }
    async getAllVaccinationRecords() {
        return this.repository.getAllVaccinationRecords();
    }
    async updateVaccinationRecord(id, data) {
        await this.getVaccinationRecordById(id);
        if (data.flockId) {
            await this.getFlockById(data.flockId);
        }
        const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
        return this.repository.updateVaccinationRecord(id, {
            ...data,
            date,
        });
    }
    async deleteVaccinationRecord(id) {
        await this.getVaccinationRecordById(id);
        return this.repository.deleteVaccinationRecord(id);
    }
    // --- MortalityRecord Service Methods ---
    async createMortalityRecord(data) {
        const flock = await this.getFlockById(data.flockId);
        const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
        // Check if mortality count exceeds current bird count
        if (data.count > flock.currentCount) {
            throw new Error(`Mortality count (${data.count}) cannot exceed current flock bird count (${flock.currentCount})`);
        }
        const record = await this.repository.createMortalityRecord({
            ...data,
            date,
        });
        // Automatically update flock current count
        const updatedCount = flock.currentCount - data.count;
        await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
        return record;
    }
    async getMortalityRecordById(id) {
        const record = await this.repository.getMortalityRecordById(id);
        if (!record) {
            throw new Error(`Mortality record with ID ${id} not found`);
        }
        return record;
    }
    async getAllMortalityRecords() {
        return this.repository.getAllMortalityRecords();
    }
    async updateMortalityRecord(id, data) {
        const originalRecord = await this.getMortalityRecordById(id);
        const flock = await this.getFlockById(originalRecord.flockId);
        let countDiff = 0;
        if (data.count !== undefined) {
            countDiff = data.count - originalRecord.count;
            if (countDiff > flock.currentCount) {
                throw new Error(`Updated mortality count exceeds available flock count by ${countDiff - flock.currentCount}`);
            }
        }
        const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
        const record = await this.repository.updateMortalityRecord(id, {
            ...data,
            date,
        });
        if (countDiff !== 0) {
            const updatedCount = flock.currentCount - countDiff;
            await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
        }
        return record;
    }
    async deleteMortalityRecord(id) {
        const record = await this.getMortalityRecordById(id);
        const flock = await this.getFlockById(record.flockId);
        // Restore the flock count by the deleted record's count
        const updatedCount = flock.currentCount + record.count;
        await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
        return this.repository.deleteMortalityRecord(id);
    }
}
exports.PoultryService = PoultryService;
