"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cropRouter = void 0;
const express_1 = require("express");
const crop_controller_1 = require("./crop.controller");
const express_2 = require("../../../../../packages/auth/src/express/index");
const router = (0, express_1.Router)();
const cropController = new crop_controller_1.CropController();
// Crop routes
router.get('/crops', (0, express_2.authMiddleware)({ permission: 'crop.read' }), cropController.getAllCrops);
router.get('/crops/:id', (0, express_2.authMiddleware)({ permission: 'crop.read' }), cropController.getCropById);
router.post('/crops', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.write' }), cropController.createCrop);
router.put('/crops/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.write' }), cropController.updateCrop);
router.delete('/crops/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.delete' }), cropController.deleteCrop);
// CropCycle routes
router.get('/cycles', (0, express_2.authMiddleware)({ permission: 'crop.read' }), cropController.getAllCropCycles);
router.get('/cycles/:id', (0, express_2.authMiddleware)({ permission: 'crop.read' }), cropController.getCropCycleById);
router.post('/cycles', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'crop.write' }), cropController.createCropCycle);
router.put('/cycles/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'crop.write' }), cropController.updateCropCycle);
router.delete('/cycles/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.delete' }), cropController.deleteCropCycle);
exports.cropRouter = router;
exports.default = router;
