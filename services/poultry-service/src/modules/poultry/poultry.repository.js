"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoultryRepository = void 0;
const database_1 = require("@farm/database");
class PoultryRepository {
    // --- PoultryHouse CRUD ---
    async createPoultryHouse(data) {
        return database_1.prisma.poultryHouse.create({
            data,
        });
    }
    async getPoultryHouseById(id) {
        return database_1.prisma.poultryHouse.findUnique({
            where: { id },
            include: { pens: true },
        });
    }
    async getAllPoultryHouses() {
        return database_1.prisma.poultryHouse.findMany({
            include: { pens: true },
        });
    }
    async updatePoultryHouse(id, data) {
        return database_1.prisma.poultryHouse.update({
            where: { id },
            data,
        });
    }
    async deletePoultryHouse(id) {
        return database_1.prisma.poultryHouse.delete({
            where: { id },
        });
    }
    // --- Pen CRUD ---
    async createPen(data) {
        return database_1.prisma.pen.create({
            data,
        });
    }
    async getPenById(id) {
        return database_1.prisma.pen.findUnique({
            where: { id },
            include: { poultryHouse: true },
        });
    }
    async getAllPens() {
        return database_1.prisma.pen.findMany({
            include: { poultryHouse: true },
        });
    }
    async updatePen(id, data) {
        return database_1.prisma.pen.update({
            where: { id },
            data,
        });
    }
    async deletePen(id) {
        return database_1.prisma.pen.delete({
            where: { id },
        });
    }
    // --- Breed CRUD ---
    async createBreed(data) {
        return database_1.prisma.breed.create({
            data,
        });
    }
    async getBreedById(id) {
        return database_1.prisma.breed.findUnique({
            where: { id },
        });
    }
    async getAllBreeds() {
        return database_1.prisma.breed.findMany();
    }
    async updateBreed(id, data) {
        return database_1.prisma.breed.update({
            where: { id },
            data,
        });
    }
    async deleteBreed(id) {
        return database_1.prisma.breed.delete({
            where: { id },
        });
    }
    // --- Flock CRUD ---
    async createFlock(data) {
        return database_1.prisma.flock.create({
            data,
            include: {
                farm: true,
                pen: true,
                breed: true,
            },
        });
    }
    async getFlockById(id) {
        return database_1.prisma.flock.findUnique({
            where: { id },
            include: {
                farm: true,
                pen: true,
                breed: true,
                feedingRecords: true,
                vaccinationRecords: true,
                mortalityRecords: true,
            },
        });
    }
    async getAllFlocks() {
        return database_1.prisma.flock.findMany({
            include: {
                farm: true,
                pen: true,
                breed: true,
            },
        });
    }
    async updateFlock(id, data) {
        return database_1.prisma.flock.update({
            where: { id },
            data,
            include: {
                farm: true,
                pen: true,
                breed: true,
            },
        });
    }
    async deleteFlock(id) {
        return database_1.prisma.flock.delete({
            where: { id },
        });
    }
    // --- FeedingRecord CRUD ---
    async createFeedingRecord(data) {
        return database_1.prisma.feedingRecord.create({
            data,
            include: { flock: true },
        });
    }
    async getFeedingRecordById(id) {
        return database_1.prisma.feedingRecord.findUnique({
            where: { id },
            include: { flock: true },
        });
    }
    async getAllFeedingRecords() {
        return database_1.prisma.feedingRecord.findMany({
            include: { flock: true },
        });
    }
    async updateFeedingRecord(id, data) {
        return database_1.prisma.feedingRecord.update({
            where: { id },
            data,
            include: { flock: true },
        });
    }
    async deleteFeedingRecord(id) {
        return database_1.prisma.feedingRecord.delete({
            where: { id },
        });
    }
    // --- VaccinationRecord CRUD ---
    async createVaccinationRecord(data) {
        return database_1.prisma.vaccinationRecord.create({
            data,
            include: { flock: true },
        });
    }
    async getVaccinationRecordById(id) {
        return database_1.prisma.vaccinationRecord.findUnique({
            where: { id },
            include: { flock: true },
        });
    }
    async getAllVaccinationRecords() {
        return database_1.prisma.vaccinationRecord.findMany({
            include: { flock: true },
        });
    }
    async updateVaccinationRecord(id, data) {
        return database_1.prisma.vaccinationRecord.update({
            where: { id },
            data,
            include: { flock: true },
        });
    }
    async deleteVaccinationRecord(id) {
        return database_1.prisma.vaccinationRecord.delete({
            where: { id },
        });
    }
    // --- MortalityRecord CRUD ---
    async createMortalityRecord(data) {
        return database_1.prisma.mortalityRecord.create({
            data,
            include: { flock: true },
        });
    }
    async getMortalityRecordById(id) {
        return database_1.prisma.mortalityRecord.findUnique({
            where: { id },
            include: { flock: true },
        });
    }
    async getAllMortalityRecords() {
        return database_1.prisma.mortalityRecord.findMany({
            include: { flock: true },
        });
    }
    async updateMortalityRecord(id, data) {
        return database_1.prisma.mortalityRecord.update({
            where: { id },
            data,
            include: { flock: true },
        });
    }
    async deleteMortalityRecord(id) {
        return database_1.prisma.mortalityRecord.delete({
            where: { id },
        });
    }
}
exports.PoultryRepository = PoultryRepository;
