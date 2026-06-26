"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingController = void 0;
const reporting_service_1 = require("./reporting.service");
const createReportSchema = {
    parse: (body) => body,
};
const updateReportSchema = {
    parse: (body) => body,
};
const service = new reporting_service_1.ReportingService();
class ReportingController {
    getOrganizationId(req) {
        const orgId = req?.user?.organizationId;
        if (!orgId) {
            const err = new Error('organizationId missing from request');
            err.statusCode = 401;
            throw err;
        }
        return orgId;
    }
    async getAllReports(req, res) {
        try {
            const organizationId = this.getOrganizationId(req);
            const reports = await service.getAllReports(organizationId);
            res.json(reports);
        }
        catch (error) {
            const status = error?.statusCode ?? 500;
            res.status(status).json({ error: error.message || error });
        }
    }
    async getReportById(req, res) {
        try {
            const id = req.params.id;
            const organizationId = this.getOrganizationId(req);
            const report = await service.getReportById(id, organizationId);
            res.json(report);
        }
        catch (error) {
            const status = error?.statusCode === 404 ? 404 : error?.statusCode ?? 500;
            res.status(status).json({ error: error.message || error });
        }
    }
    async createReport(req, res) {
        try {
            const validated = createReportSchema.parse(req.body);
            const organizationId = this.getOrganizationId(req);
            const report = await service.createReport(validated, organizationId);
            res.status(201).json(report);
        }
        catch (error) {
            const status = error?.statusCode ?? 400;
            res.status(status).json({ error: error.message || error });
        }
    }
    async updateReport(req, res) {
        try {
            const id = req.params.id;
            const validated = updateReportSchema.parse(req.body);
            const organizationId = this.getOrganizationId(req);
            const report = await service.updateReport(id, validated, organizationId);
            res.json(report);
        }
        catch (error) {
            const status = error?.statusCode ?? 400;
            res.status(status).json({ error: error.message || error });
        }
    }
    async deleteReport(req, res) {
        try {
            const id = req.params.id;
            const organizationId = this.getOrganizationId(req);
            await service.deleteReport(id, organizationId);
            res.status(204).send();
        }
        catch (error) {
            const status = error?.statusCode ?? 400;
            res.status(status).json({ error: error.message || error });
        }
    }
}
exports.ReportingController = ReportingController;
