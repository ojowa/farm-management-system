"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = require("../../../../../packages/auth/src/express/index");
const reporting_controller_1 = require("./reporting.controller");
const router = (0, express_1.Router)();
const controller = new reporting_controller_1.ReportingController();
// CRUD for reporting artifacts
// List
router.get('/reports', (0, express_2.authMiddleware)({ permission: 'reporting.read' }), controller.getAllReports);
// Detail
router.get('/reports/:id', (0, express_2.authMiddleware)({ permission: 'reporting.read' }), controller.getReportById);
// Create
router.post('/reports', (0, express_2.authMiddleware)({
    roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.write',
}), controller.createReport);
// Update
router.put('/reports/:id', (0, express_2.authMiddleware)({
    roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.write',
}), controller.updateReport);
// Delete
router.delete('/reports/:id', (0, express_2.authMiddleware)({
    roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.delete',
}), controller.deleteReport);
exports.default = router;
