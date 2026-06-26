"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationRepository = void 0;
const database_1 = require("@farm/database");
const asPlan = (plan) => {
    const allowed = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
    return (allowed.includes(plan) ? plan : 'FREE');
};
const defaultSettings = {
    currency: 'USD',
    timezone: 'UTC',
    language: 'en',
    measurementUnit: 'METRIC',
    dateFormat: 'YYYY-MM-DD',
};
const toJson = (value) => value;
class OrganizationRepository {
    async create(data) {
        return database_1.prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                email: data.adminEmail,
                subscriptionPlan: asPlan(data.subscriptionPlan),
                subscriptionStatus: 'TRIAL',
                settings: toJson(defaultSettings),
            },
        });
    }
    async findById(id) {
        return database_1.prisma.organization.findUnique({
            where: { id },
        });
    }
    async findBySlug(slug) {
        return database_1.prisma.organization.findUnique({
            where: { slug },
        });
    }
    async update(id, data) {
        const { settings, ...rest } = data;
        return database_1.prisma.organization.update({
            where: { id },
            data: {
                ...rest,
                ...(settings ? { settings: toJson(settings) } : {}),
                updatedAt: new Date(),
            },
        });
    }
    async findAll() {
        return database_1.prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async delete(id) {
        await database_1.prisma.organization.delete({
            where: { id },
        });
    }
}
exports.OrganizationRepository = OrganizationRepository;
