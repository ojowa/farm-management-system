"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrganizationSchema = exports.createOrganizationSchema = exports.organizationSettingsSchema = void 0;
const zod_1 = require("zod");
exports.organizationSettingsSchema = zod_1.z.object({
    currency: zod_1.z.string().length(3),
    timezone: zod_1.z.string(),
    language: zod_1.z.string().length(2),
    measurementUnit: zod_1.z.enum(['METRIC', 'IMPERIAL']),
    dateFormat: zod_1.z.string(),
});
exports.createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
    adminEmail: zod_1.z.string().email(),
    subscriptionPlan: zod_1.z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
    settings: exports.organizationSettingsSchema.optional(),
});
exports.updateOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    logo: zod_1.z.string().url().optional(),
    website: zod_1.z.string().url().optional(),
    industry: zod_1.z.string().optional(),
    settings: exports.organizationSettingsSchema.optional(),
});
