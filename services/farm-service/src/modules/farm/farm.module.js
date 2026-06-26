"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.farmRouter = void 0;
const express_1 = require("express");
const farm_controller_1 = require("./farm.controller");
const express_2 = require("../../../../../packages/auth/src/express/index");
const router = (0, express_1.Router)();
const farmController = new farm_controller_1.FarmController();
// Farm routes
router.get('/farms', (0, express_2.authMiddleware)({ permission: 'farm.read' }), farmController.getAllFarms);
router.get('/farms/:id', (0, express_2.authMiddleware)({ permission: 'farm.read' }), farmController.getFarmById);
router.post('/farms', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.write' }), farmController.createFarm);
router.put('/farms/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.write' }), farmController.updateFarm);
router.delete('/farms/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.delete' }), farmController.deleteFarm);
// Field routes
router.get('/fields', (0, express_2.authMiddleware)({ permission: 'farm.read' }), farmController.getAllFields);
router.get('/fields/:id', (0, express_2.authMiddleware)({ permission: 'farm.read' }), farmController.getFieldById);
router.post('/fields', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'farm.write' }), farmController.createField);
router.put('/fields/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'farm.write' }), farmController.updateField);
router.delete('/fields/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.delete' }), farmController.deleteField);
exports.farmRouter = router;
exports.default = router;
