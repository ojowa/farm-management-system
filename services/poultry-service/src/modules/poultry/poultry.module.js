"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poultryRouter = void 0;
const express_1 = require("express");
const poultry_controller_1 = require("./poultry.controller");
const express_2 = require("../../../../../packages/auth/src/express/index");
const router = (0, express_1.Router)();
const poultryController = new poultry_controller_1.PoultryController();
const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];
const vetRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'];
const deleteRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'];
// PoultryHouse routes
router.get('/poultry-houses', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllPoultryHouses);
router.get('/poultry-houses/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getPoultryHouseById);
router.post('/poultry-houses', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createPoultryHouse);
router.put('/poultry-houses/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updatePoultryHouse);
router.delete('/poultry-houses/:id', (0, express_2.authMiddleware)({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deletePoultryHouse);
// Pen routes
router.get('/pens', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllPens);
router.get('/pens/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getPenById);
router.post('/pens', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createPen);
router.put('/pens/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updatePen);
router.delete('/pens/:id', (0, express_2.authMiddleware)({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deletePen);
// Breed routes
router.get('/breeds', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllBreeds);
router.get('/breeds/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getBreedById);
router.post('/breeds', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createBreed);
router.put('/breeds/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateBreed);
router.delete('/breeds/:id', (0, express_2.authMiddleware)({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deleteBreed);
// Flock routes
router.get('/flocks', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllFlocks);
router.get('/flocks/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getFlockById);
router.post('/flocks', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createFlock);
router.put('/flocks/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateFlock);
router.delete('/flocks/:id', (0, express_2.authMiddleware)({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deleteFlock);
// FeedingRecord routes
router.get('/feeding-records', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllFeedingRecords);
router.get('/feeding-records/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getFeedingRecordById);
router.post('/feeding-records', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createFeedingRecord);
router.put('/feeding-records/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateFeedingRecord);
router.delete('/feeding-records/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.delete' }), poultryController.deleteFeedingRecord);
// VaccinationRecord routes
router.get('/vaccination-records', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllVaccinationRecords);
router.get('/vaccination-records/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getVaccinationRecordById);
router.post('/vaccination-records', (0, express_2.authMiddleware)({ roles: vetRoles, permission: 'poultry.write' }), poultryController.createVaccinationRecord);
router.put('/vaccination-records/:id', (0, express_2.authMiddleware)({ roles: vetRoles, permission: 'poultry.write' }), poultryController.updateVaccinationRecord);
router.delete('/vaccination-records/:id', (0, express_2.authMiddleware)({ roles: vetRoles, permission: 'poultry.delete' }), poultryController.deleteVaccinationRecord);
// MortalityRecord routes
router.get('/mortality-records', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getAllMortalityRecords);
router.get('/mortality-records/:id', (0, express_2.authMiddleware)({ permission: 'poultry.read' }), poultryController.getMortalityRecordById);
router.post('/mortality-records', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createMortalityRecord);
router.put('/mortality-records/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateMortalityRecord);
router.delete('/mortality-records/:id', (0, express_2.authMiddleware)({ roles: writeRoles, permission: 'poultry.delete' }), poultryController.deleteMortalityRecord);
exports.poultryRouter = router;
exports.default = router;
