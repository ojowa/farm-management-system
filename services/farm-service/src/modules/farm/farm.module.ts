import { Router } from 'express';
import { FarmController } from './farm.controller';
import { authMiddleware } from '@farm/auth/express';
import { subscriptionLimitGuard, farmTypeGuard } from '@farm/database';

const router = Router();
const farmController = new FarmController();

// Farm routes
router.get(
  '/farms',
  authMiddleware({ permission: 'farm.read' }),
  farmController.getAllFarms,
);
router.get(
  '/farms/:id',
  authMiddleware({ permission: 'farm.read' }),
  farmController.getFarmById,
);
router.post(
  '/farms',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.write' }),
  subscriptionLimitGuard('farms'),
  farmTypeGuard,
  farmController.createFarm,
);
router.put(
  '/farms/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.write' }),
  farmController.updateFarm,
);
router.delete(
  '/farms/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.delete' }),
  farmController.deleteFarm,
);

// Field routes
router.get(
  '/fields',
  authMiddleware({ permission: 'farm.read' }),
  farmController.getAllFields,
);
router.get(
  '/fields/:id',
  authMiddleware({ permission: 'farm.read' }),
  farmController.getFieldById,
);
router.post(
  '/fields',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'farm.write' }),
  farmController.createField,
);
router.put(
  '/fields/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'farm.write' }),
  farmController.updateField,
);
router.delete(
  '/fields/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'farm.delete' }),
  farmController.deleteField,
);

export const farmRouter = router;
export default router;
