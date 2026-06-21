import { Router } from 'express';
import { LivestockController } from './livestock.controller';

const router = Router();
const livestockController = new LivestockController();

router.post('/livestock', livestockController.createLivestock);
router.get('/livestock', livestockController.getAllLivestock);
router.get('/livestock/:id', livestockController.getLivestockById);
router.put('/livestock/:id', livestockController.updateLivestock);
router.delete('/livestock/:id', livestockController.deleteLivestock);

export const livestockRouter = router;
export default router;
