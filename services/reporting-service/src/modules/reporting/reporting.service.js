"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const database_1 = require("@farm/database");
// MVP approach:
// Since reporting-service/prisma/schema.prisma does NOT define a dedicated Report model,
// we implement CRUD over SyncQueue as a "report job/definition" artifact.
// entity='report', operation in ('create','update','delete','generate')
// payload stores JSON string.
class ReportingService {
    assertFarmExists = async (farmId) => {
        const farm = await database_1.prisma.farm.findUnique({ where: { id: farmId } });
        if (!farm) {
            const err = new Error(`Farm with ID ${farmId} not found`);
            err.statusCode = 404;
            throw err;
        }
        return farm;
    };
    getOrganizationId(req) {
        const orgId = req?.user?.organizationId;
        if (!orgId) {
            const err = new Error('organizationId missing from request');
            err.statusCode = 401;
            throw err;
        }
        return orgId;
    }
    assertFarmBelongsToOrganization = async (farmId, organizationId) => {
        const farm = await database_1.prisma.farm.findFirst({
            where: { id: farmId, organizationId },
            select: { id: true },
        });
        if (!farm) {
            const err = new Error(`Farm with ID ${farmId} not found for this organization`);
            err.statusCode = 404;
            throw err;
        }
        return farm;
    };
    async getAllReports(organizationId) {
        const reports = await database_1.prisma.syncQueue.findMany({
            where: { entity: 'report' },
            orderBy: { createdAt: 'desc' },
        });
        // syncQueue lacks organizationId in schema; enforce tenant isolation by filtering payload.farmId.
        // Optimize by avoiding per-report farm lookups (N+1).
        const payloadByReportId = new Map();
        const distinctFarmIds = new Set();
        for (const r of reports) {
            const payload = (() => {
                try {
                    return r.payload ? JSON.parse(r.payload) : {};
                }
                catch {
                    return {};
                }
            })();
            const farmId = payload?.farmId;
            if (farmId) {
                distinctFarmIds.add(farmId);
                payloadByReportId.set(r.id, { farmId });
            }
        }
        if (distinctFarmIds.size === 0)
            return [];
        const allowedFarms = await database_1.prisma.farm.findMany({
            where: {
                id: { in: Array.from(distinctFarmIds) },
                organizationId,
            },
            select: { id: true },
        });
        const allowedFarmIdSet = new Set(allowedFarms.map((f) => f.id));
        return reports.filter((r) => {
            const p = payloadByReportId.get(r.id);
            const farmId = p?.farmId;
            return !!farmId && allowedFarmIdSet.has(farmId);
        });
    }
    async getReportById(id, organizationId) {
        const report = await database_1.prisma.syncQueue.findUnique({ where: { id } });
        if (!report || report.entity !== 'report') {
            const err = new Error(`Report with ID ${id} not found`);
            err.statusCode = 404;
            throw err;
        }
        const payload = (() => {
            try {
                return report.payload ? JSON.parse(report.payload) : {};
            }
            catch {
                return {};
            }
        })();
        const farmId = payload?.farmId;
        if (!farmId) {
            const err = new Error(`Report ${id} is missing farmId`);
            err.statusCode = 400;
            throw err;
        }
        await this.assertFarmBelongsToOrganization(farmId, organizationId);
        return report;
    }
    async createReport(data, organizationId) {
        // minimal runtime validation (avoid new zod dependency)
        if (!data?.farmId || !data?.title) {
            const err = new Error('farmId and title are required');
            err.statusCode = 400;
            throw err;
        }
        await this.assertFarmBelongsToOrganization(data.farmId, organizationId);
        return database_1.prisma.syncQueue.create({
            data: {
                entity: 'report',
                entityId: undefined, // not used in MVP
                operation: 'create',
                payload: JSON.stringify({
                    farmId: data.farmId,
                    title: data.title,
                    status: data.status ?? 'pending',
                    parameters: data.parameters ?? {},
                }),
            },
        });
    }
    async updateReport(id, data, organizationId) {
        if (!data || typeof data !== 'object') {
            const err = new Error('Invalid payload');
            err.statusCode = 400;
            throw err;
        }
        // optional title validation if provided
        if (data.title !== undefined && String(data.title).length < 2) {
            const err = new Error('title must be at least 2 characters');
            err.statusCode = 400;
            throw err;
        }
        const existing = await this.getReportById(id, organizationId);
        const payload = (() => {
            try {
                return existing.payload ? JSON.parse(existing.payload) : {};
            }
            catch {
                return {};
            }
        })();
        const nextFarmId = data.farmId ?? payload.farmId;
        if (nextFarmId) {
            await this.assertFarmBelongsToOrganization(nextFarmId, organizationId);
        }
        const merged = {
            ...payload,
            ...data,
        };
        return database_1.prisma.syncQueue.update({
            where: { id },
            data: {
                operation: 'update',
                payload: JSON.stringify(merged),
            },
        });
    }
    async deleteReport(id, organizationId) {
        await this.getReportById(id, organizationId);
        return database_1.prisma.syncQueue.delete({ where: { id } });
    }
}
exports.ReportingService = ReportingService;
