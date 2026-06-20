import { Router } from 'express';
import { CropController } from './crop.controller';

const router = Router();
const cropController = new CropController();

// Crop Routes
router.post('/crops', cropController.createCrop);
router.get('/crops', cropController.getAllCrops);
router.get('/crops/:id', cropController.getCropById);
router.put('/crops/:id', cropController.updateCrop);
router.delete('/crops/:id', cropController.deleteCrop);

// CropCycle Routes
router.post('/cycles', cropController.createCropCycle);
router.get('/cycles', cropController.getAllCropCycles);
router.get('/cycles/:id', cropController.getCropCycleById);
router.put('/cycles/:id', cropController.updateCropCycle);
router.delete('/cycles/:id', cropController.deleteCropCycle);

export const cropRouter = router;
export default router;
