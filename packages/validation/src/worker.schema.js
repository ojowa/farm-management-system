"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkerSchema = exports.createWorkerSchema = void 0;
const zod_1 = require("zod");
exports.createWorkerSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    role: zod_1.z.string().min(2),
});
exports.updateWorkerSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(2).optional(),
    role: zod_1.z.string().min(2).optional(),
});
