import { Router } from 'express';
import { FarmController } from './farm.controller';

const router = Router();
const farmController = new FarmController();

router.post('/farms', farmController.createFarm);
router.get('/farms', farmController.getAllFarms);
router.get('/farms/:id', farmController.getFarmById);
router.put('/farms/:id', farmController.updateFarm);
router.delete('/farms/:id', farmController.deleteFarm);

export const farmRouter = router;
export default router;
