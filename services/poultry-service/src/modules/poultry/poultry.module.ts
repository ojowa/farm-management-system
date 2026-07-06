import { Router } from 'express';
import { PoultryController } from './poultry.controller';
import { MedicationController } from './medication.controller';

const router = Router();
const poultryController = new PoultryController();
const medicationController = new MedicationController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];
const vetRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'];
const deleteRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'];

// PoultryHouse routes
router.get('/poultry-houses', poultryController.getAllPoultryHouses);
router.get('/poultry-houses/:id', poultryController.getPoultryHouseById);
router.post('/poultry-houses', poultryController.createPoultryHouse);
router.put('/poultry-houses/:id', poultryController.updatePoultryHouse);
router.delete('/poultry-houses/:id', poultryController.deletePoultryHouse);

// Pen routes
router.get('/pens', poultryController.getAllPens);
router.get('/pens/:id', poultryController.getPenById);
router.post('/pens', poultryController.createPen);
router.put('/pens/:id', poultryController.updatePen);
router.delete('/pens/:id', poultryController.deletePen);

// Breed routes
router.get('/breeds', poultryController.getAllBreeds);
router.get('/breeds/:id', poultryController.getBreedById);
router.post('/breeds', poultryController.createBreed);
router.put('/breeds/:id', poultryController.updateBreed);
router.delete('/breeds/:id', poultryController.deleteBreed);

// Flock routes
router.get('/flocks', poultryController.getAllFlocks);
router.get('/flocks/:id', poultryController.getFlockById);
router.post('/flocks', poultryController.createFlock);
router.put('/flocks/:id', poultryController.updateFlock);
router.delete('/flocks/:id', poultryController.deleteFlock);

// FeedingRecord routes
router.get('/feeding-records', poultryController.getAllFeedingRecords);
router.get('/feeding-records/:id', poultryController.getFeedingRecordById);
router.post('/feeding-records', poultryController.createFeedingRecord);
router.put('/feeding-records/:id', poultryController.updateFeedingRecord);
router.delete('/feeding-records/:id', poultryController.deleteFeedingRecord);

// VaccinationRecord routes
router.get('/vaccination-records', poultryController.getAllVaccinationRecords);
router.get('/vaccination-records/:id', poultryController.getVaccinationRecordById);
router.post('/vaccination-records', poultryController.createVaccinationRecord);
router.put('/vaccination-records/:id', poultryController.updateVaccinationRecord);
router.delete('/vaccination-records/:id', poultryController.deleteVaccinationRecord);

// MortalityRecord routes
router.get('/mortality-records', poultryController.getAllMortalityRecords);
router.get('/mortality-records/:id', poultryController.getMortalityRecordById);
router.post('/mortality-records', poultryController.createMortalityRecord);
router.put('/mortality-records/:id', poultryController.updateMortalityRecord);
router.delete('/mortality-records/:id', poultryController.deleteMortalityRecord);

// Medication routes
router.get('/medications', medicationController.getAllMedications);
router.get('/medications/:id', medicationController.getMedicationById);
router.post('/medications', medicationController.createMedication);
router.put('/medications/:id', medicationController.updateMedication);
router.delete('/medications/:id', medicationController.deleteMedication);

export const poultryRouter = router;
export default router;
