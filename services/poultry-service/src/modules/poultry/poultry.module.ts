import { Router } from 'express';
import { PoultryController } from './poultry.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const poultryController = new PoultryController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];
const vetRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'];
const deleteRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'];

// PoultryHouse routes
router.get('/poultry-houses', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllPoultryHouses);
router.get('/poultry-houses/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getPoultryHouseById);
router.post('/poultry-houses', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createPoultryHouse);
router.put('/poultry-houses/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updatePoultryHouse);
router.delete('/poultry-houses/:id', authMiddleware({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deletePoultryHouse);

// Pen routes
router.get('/pens', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllPens);
router.get('/pens/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getPenById);
router.post('/pens', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createPen);
router.put('/pens/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updatePen);
router.delete('/pens/:id', authMiddleware({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deletePen);

// Breed routes
router.get('/breeds', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllBreeds);
router.get('/breeds/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getBreedById);
router.post('/breeds', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createBreed);
router.put('/breeds/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateBreed);
router.delete('/breeds/:id', authMiddleware({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deleteBreed);

// Flock routes
router.get('/flocks', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllFlocks);
router.get('/flocks/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getFlockById);
router.post('/flocks', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createFlock);
router.put('/flocks/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateFlock);
router.delete('/flocks/:id', authMiddleware({ roles: deleteRoles, permission: 'poultry.delete' }), poultryController.deleteFlock);

// FeedingRecord routes
router.get('/feeding-records', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllFeedingRecords);
router.get('/feeding-records/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getFeedingRecordById);
router.post('/feeding-records', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createFeedingRecord);
router.put('/feeding-records/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateFeedingRecord);
router.delete('/feeding-records/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.delete' }), poultryController.deleteFeedingRecord);

// VaccinationRecord routes
router.get('/vaccination-records', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllVaccinationRecords);
router.get('/vaccination-records/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getVaccinationRecordById);
router.post('/vaccination-records', authMiddleware({ roles: vetRoles, permission: 'poultry.write' }), poultryController.createVaccinationRecord);
router.put('/vaccination-records/:id', authMiddleware({ roles: vetRoles, permission: 'poultry.write' }), poultryController.updateVaccinationRecord);
router.delete('/vaccination-records/:id', authMiddleware({ roles: vetRoles, permission: 'poultry.delete' }), poultryController.deleteVaccinationRecord);

// MortalityRecord routes
router.get('/mortality-records', authMiddleware({ permission: 'poultry.read' }), poultryController.getAllMortalityRecords);
router.get('/mortality-records/:id', authMiddleware({ permission: 'poultry.read' }), poultryController.getMortalityRecordById);
router.post('/mortality-records', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.createMortalityRecord);
router.put('/mortality-records/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), poultryController.updateMortalityRecord);
router.delete('/mortality-records/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.delete' }), poultryController.deleteMortalityRecord);

export const poultryRouter = router;
export default router;
