"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryItemSchema = exports.updateInventoryItemSchema = exports.createInventoryItemSchema = void 0;
const zod_1 = require("zod");
exports.createInventoryItemSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    category: zod_1.z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'EQUIPMENT', 'OTHER']),
    quantity: zod_1.z.number().nonnegative(),
    unit: zod_1.z.string().min(1),
});
exports.updateInventoryItemSchema = zod_1.z.object({
    farmId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(2).optional(),
    category: zod_1.z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'EQUIPMENT', 'OTHER']).optional(),
    quantity: zod_1.z.number().nonnegative().optional(),
    unit: zod_1.z.string().min(1).optional(),
});
// Backwards-compatible alias retained for existing call sites
exports.inventoryItemSchema = exports.createInventoryItemSchema;
