import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const inventoryController = new InventoryController();

router.get(
  '/inventory',
  authMiddleware({ permission: 'inventory.read' }),
  inventoryController.getAllInventoryItems,
);
router.get(
  '/inventory/:id',
  authMiddleware({ permission: 'inventory.read' }),
  inventoryController.getInventoryItemById,
);
router.post(
  '/inventory',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'inventory.write' }),
  inventoryController.createInventoryItem,
);
router.put(
  '/inventory/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'inventory.write' }),
  inventoryController.updateInventoryItem,
);
router.delete(
  '/inventory/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'inventory.delete' }),
  inventoryController.deleteInventoryItem,
);

export const inventoryRouter = router;
export default router;
