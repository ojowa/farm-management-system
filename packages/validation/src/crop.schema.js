"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCropCycleSchema = exports.createCropCycleSchema = exports.updateCropSchema = exports.createCropSchema = void 0;
const zod_1 = require("zod");
exports.createCropSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
});
exports.updateCropSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
});
exports.createCropCycleSchema = zod_1.z.object({
    fieldId: zod_1.z.string().uuid(),
    cropId: zod_1.z.string().uuid(),
    plantingDate: zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    harvestDate: zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});
exports.updateCropCycleSchema = zod_1.z.object({
    fieldId: zod_1.z.string().uuid().optional(),
    cropId: zod_1.z.string().uuid().optional(),
    plantingDate: zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    harvestDate: zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});
