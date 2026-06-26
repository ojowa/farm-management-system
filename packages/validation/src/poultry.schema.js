"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poultryBatchSchema = exports.updateMortalityRecordSchema = exports.createMortalityRecordSchema = exports.updateVaccinationRecordSchema = exports.createVaccinationRecordSchema = exports.updateFeedingRecordSchema = exports.createFeedingRecordSchema = exports.updateFlockSchema = exports.createFlockSchema = exports.updateBreedSchema = exports.createBreedSchema = exports.updatePenSchema = exports.createPenSchema = exports.updatePoultryHouseSchema = exports.createPoultryHouseSchema = void 0;
const zod_1 = require("zod");
const dateSchema = zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/));
exports.createPoultryHouseSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    capacity: zod_1.z.number().int().positive(),
});
exports.updatePoultryHouseSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(2).optional(),
    capacity: zod_1.z.number().int().positive().optional(),
});
exports.createPenSchema = zod_1.z.object({
    poultryHouseId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    capacity: zod_1.z.number().int().positive(),
});
exports.updatePenSchema = zod_1.z.object({
    poultryHouseId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).optional(),
    capacity: zod_1.z.number().int().positive().optional(),
});
exports.createBreedSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    birdType: zod_1.z.string().min(2),
});
exports.updateBreedSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    birdType: zod_1.z.string().min(2).optional(),
});
exports.createFlockSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    farmId: zod_1.z.string().uuid(),
    penId: zod_1.z.string().uuid(),
    breedId: zod_1.z.string().uuid(),
    batchCode: zod_1.z.string().min(2),
    birdCount: zod_1.z.number().int().nonnegative(),
    currentCount: zod_1.z.number().int().nonnegative(),
    arrivalDate: dateSchema,
    currentAgeDays: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.string().min(2),
});
exports.updateFlockSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid().optional(),
    farmId: zod_1.z.string().uuid().optional(),
    penId: zod_1.z.string().uuid().optional(),
    breedId: zod_1.z.string().uuid().optional(),
    batchCode: zod_1.z.string().min(2).optional(),
    birdCount: zod_1.z.number().int().nonnegative().optional(),
    currentCount: zod_1.z.number().int().nonnegative().optional(),
    arrivalDate: dateSchema.optional(),
    currentAgeDays: zod_1.z.number().int().nonnegative().optional(),
    status: zod_1.z.string().min(2).optional(),
});
exports.createFeedingRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid(),
    feedType: zod_1.z.string().min(2),
    quantityKg: zod_1.z.number().positive(),
    date: dateSchema,
});
exports.updateFeedingRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid().optional(),
    feedType: zod_1.z.string().min(2).optional(),
    quantityKg: zod_1.z.number().positive().optional(),
    date: dateSchema.optional(),
});
exports.createVaccinationRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid(),
    vaccine: zod_1.z.string().min(2),
    dosage: zod_1.z.string().optional().nullable(),
    date: dateSchema,
});
exports.updateVaccinationRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid().optional(),
    vaccine: zod_1.z.string().min(2).optional(),
    dosage: zod_1.z.string().optional().nullable(),
    date: dateSchema.optional(),
});
exports.createMortalityRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid(),
    count: zod_1.z.number().int().positive(),
    cause: zod_1.z.string().optional().nullable(),
    date: dateSchema,
});
exports.updateMortalityRecordSchema = zod_1.z.object({
    flockId: zod_1.z.string().uuid().optional(),
    count: zod_1.z.number().int().positive().optional(),
    cause: zod_1.z.string().optional().nullable(),
    date: dateSchema.optional(),
});
// For compatibility with previous schema
exports.poultryBatchSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['BROILER', 'LAYER']),
    quantity: zod_1.z.number().positive(),
    arrivalDate: zod_1.z.date().or(zod_1.z.string().datetime()),
});
