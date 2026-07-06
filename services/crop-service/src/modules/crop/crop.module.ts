import { Router } from 'express';
import { CropController } from './crop.controller';
import { authMiddleware } from '@farm/auth/express';
import { lifecycleRouter } from './lifecycle.routes';
import { irrigationRouter } from './irrigation.routes';
import { pestDiseaseRouter } from './pest-disease.routes';
import { yieldRouter } from './yield.routes';

const router = Router();
const cropController = new CropController();

// Crop routes
router.get(
  '/crops',
  authMiddleware({ permission: 'crop.read' }),
  cropController.getAllCrops,
);
router.get(
  '/crops/:id',
  authMiddleware({ permission: 'crop.read' }),
  cropController.getCropById,
);
router.post(
  '/crops',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.write' }),
  cropController.createCrop,
);
router.put(
  '/crops/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.write' }),
  cropController.updateCrop,
);
router.delete(
  '/crops/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.delete' }),
  cropController.deleteCrop,
);

// CropCycle routes
router.get(
  '/cycles',
  authMiddleware({ permission: 'crop.read' }),
  cropController.getAllCropCycles,
);
router.get(
  '/cycles/:id',
  authMiddleware({ permission: 'crop.read' }),
  cropController.getCropCycleById,
);
router.post(
  '/cycles',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'crop.write' }),
  cropController.createCropCycle,
);
router.put(
  '/cycles/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'crop.write' }),
  cropController.updateCropCycle,
);
router.delete(
  '/cycles/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'crop.delete' }),
  cropController.deleteCropCycle,
);

// Lifecycle routes
router.use('/lifecycle', lifecycleRouter);

// Irrigation routes
router.use('/irrigation', irrigationRouter);

// Pest/Disease routes
router.use('/pest-disease', pestDiseaseRouter);

// Yield routes
router.use('/yield', yieldRouter);

export const cropRouter = router;
export default router;
