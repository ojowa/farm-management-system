"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFieldSchema = exports.createFieldSchema = exports.updateFarmSchema = exports.createFarmSchema = void 0;
const zod_1 = require("zod");
exports.createFarmSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    location: zod_1.z.string().min(2).nullable().optional(),
    latitude: zod_1.z.number().optional().nullable(),
    longitude: zod_1.z.number().optional().nullable(),
});
exports.updateFarmSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(2).optional(),
    location: zod_1.z.string().min(2).nullable().optional(),
    latitude: zod_1.z.number().optional().nullable(),
    longitude: zod_1.z.number().optional().nullable(),
});
exports.createFieldSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    size: zod_1.z.number().positive(),
});
exports.updateFieldSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(2).optional(),
    size: zod_1.z.number().positive().optional(),
});
