"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLivestockSchema = exports.createLivestockSchema = void 0;
const zod_1 = require("zod");
const dateSchema = zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/));
const genderSchema = zod_1.z.enum(['MALE', 'FEMALE']);
const statusSchema = zod_1.z.enum(['HEALTHY', 'SICK', 'SOLD', 'DECEASED']);
exports.createLivestockSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    species: zod_1.z.string().min(2),
    breed: zod_1.z.string().min(1).nullable().optional(),
    gender: genderSchema,
    birthDate: dateSchema,
    status: statusSchema,
});
exports.updateLivestockSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    species: zod_1.z.string().min(2).optional(),
    breed: zod_1.z.string().min(1).nullable().optional(),
    gender: genderSchema.optional(),
    birthDate: dateSchema.optional(),
    status: statusSchema.optional(),
});
