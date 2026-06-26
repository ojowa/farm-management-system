"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSaleSchema = exports.createSaleSchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const dateSchema = zod_1.z.string().datetime().or(zod_1.z.date()).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/));
exports.createExpenseSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(2),
    amount: zod_1.z.number().positive(),
    date: dateSchema,
});
exports.updateExpenseSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2).optional(),
    amount: zod_1.z.number().positive().optional(),
    date: dateSchema.optional(),
});
exports.createSaleSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    item: zod_1.z.string().min(2),
    quantity: zod_1.z.number().positive(),
    price: zod_1.z.number().nonnegative(),
    total: zod_1.z.number().nonnegative(),
    date: dateSchema,
});
exports.updateSaleSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    item: zod_1.z.string().min(2).optional(),
    quantity: zod_1.z.number().positive().optional(),
    price: zod_1.z.number().nonnegative().optional(),
    total: zod_1.z.number().nonnegative().optional(),
    date: dateSchema.optional(),
});
