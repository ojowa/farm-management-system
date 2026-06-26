import { Router } from 'express';
import { LivestockController } from './livestock.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const livestockController = new LivestockController();

router.get(
  '/livestock',
  authMiddleware({ permission: 'livestock.read' }),
  livestockController.getAllLivestock,
);
router.get(
  '/livestock/:id',
  authMiddleware({ permission: 'livestock.read' }),
  livestockController.getLivestockById,
);
router.post(
  '/livestock',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'], permission: 'livestock.write' }),
  livestockController.createLivestock,
);
router.put(
  '/livestock/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'], permission: 'livestock.write' }),
  livestockController.updateLivestock,
);
router.delete(
  '/livestock/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'VETERINARIAN', 'SUPER_ADMIN'], permission: 'livestock.delete' }),
  livestockController.deleteLivestock,
);

export const livestockRouter = router;
export default router;
