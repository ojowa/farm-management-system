"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationSchema = exports.createNotificationSchema = void 0;
const zod_1 = require("zod");
exports.createNotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    message: zod_1.z.string().min(1).max(1000),
    type: zod_1.z.enum(['INFO', 'WARNING', 'ALERT', 'SUCCESS']).optional(),
});
exports.updateNotificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    message: zod_1.z.string().min(1).max(1000).optional(),
    type: zod_1.z.enum(['INFO', 'WARNING', 'ALERT', 'SUCCESS']).optional(),
    read: zod_1.z.boolean().optional(),
});
