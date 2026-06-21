import { Router } from 'express';
import { PoultryController } from './poultry.controller';

const router = Router();
const poultryController = new PoultryController();

// PoultryHouse routes
router.post('/poultry-houses', poultryController.createPoultryHouse);
router.get('/poultry-houses', poultryController.getAllPoultryHouses);
router.get('/poultry-houses/:id', poultryController.getPoultryHouseById);
router.put('/poultry-houses/:id', poultryController.updatePoultryHouse);
router.delete('/poultry-houses/:id', poultryController.deletePoultryHouse);

// Pen routes
router.post('/pens', poultryController.createPen);
router.get('/pens', poultryController.getAllPens);
router.get('/pens/:id', poultryController.getPenById);
router.put('/pens/:id', poultryController.updatePen);
router.delete('/pens/:id', poultryController.deletePen);

// Breed routes
router.post('/breeds', poultryController.createBreed);
router.get('/breeds', poultryController.getAllBreeds);
router.get('/breeds/:id', poultryController.getBreedById);
router.put('/breeds/:id', poultryController.updateBreed);
router.delete('/breeds/:id', poultryController.deleteBreed);

// Flock routes
router.post('/flocks', poultryController.createFlock);
router.get('/flocks', poultryController.getAllFlocks);
router.get('/flocks/:id', poultryController.getFlockById);
router.put('/flocks/:id', poultryController.updateFlock);
router.delete('/flocks/:id', poultryController.deleteFlock);

// FeedingRecord routes
router.post('/feeding-records', poultryController.createFeedingRecord);
router.get('/feeding-records', poultryController.getAllFeedingRecords);
router.get('/feeding-records/:id', poultryController.getFeedingRecordById);
router.put('/feeding-records/:id', poultryController.updateFeedingRecord);
router.delete('/feeding-records/:id', poultryController.deleteFeedingRecord);

// VaccinationRecord routes
router.post('/vaccination-records', poultryController.createVaccinationRecord);
router.get('/vaccination-records', poultryController.getAllVaccinationRecords);
router.get('/vaccination-records/:id', poultryController.getVaccinationRecordById);
router.put('/vaccination-records/:id', poultryController.updateVaccinationRecord);
router.delete('/vaccination-records/:id', poultryController.deleteVaccinationRecord);

// MortalityRecord routes
router.post('/mortality-records', poultryController.createMortalityRecord);
router.get('/mortality-records', poultryController.getAllMortalityRecords);
router.get('/mortality-records/:id', poultryController.getMortalityRecordById);
router.put('/mortality-records/:id', poultryController.updateMortalityRecord);
router.delete('/mortality-records/:id', poultryController.deleteMortalityRecord);

export const poultryRouter = router;
export default router;
