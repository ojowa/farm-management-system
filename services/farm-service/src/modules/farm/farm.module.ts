import { Router } from 'express';
import { FarmController } from './farm.controller';
import { subscriptionLimitGuard, farmTypeGuard } from '@farm/database';

const router = Router();
const farmController = new FarmController();

// Farm routes
router.get('/farms', farmController.getAllFarms);
router.get('/farms/:id', farmController.getFarmById);
router.post(
  '/farms',
  subscriptionLimitGuard('farms'),
  farmTypeGuard,
  farmController.createFarm,
);
router.put('/farms/:id', farmController.updateFarm);
router.delete('/farms/:id', farmController.deleteFarm);

// Field routes
router.get('/fields', farmController.getAllFields);
router.get('/fields/:id', farmController.getFieldById);
router.post('/fields', farmController.createField);
router.put('/fields/:id', farmController.updateField);
router.delete('/fields/:id', farmController.deleteField);

export const farmRouter = router;
export default router;
