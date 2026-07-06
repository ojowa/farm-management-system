import { Router } from 'express';
import { InventoryController } from './inventory.controller';

const router = Router();
const inventoryController = new InventoryController();

router.get('/inventory', inventoryController.getAllInventoryItems);
router.get('/inventory/:id', inventoryController.getInventoryItemById);
router.post('/inventory', inventoryController.createInventoryItem);
router.put('/inventory/:id', inventoryController.updateInventoryItem);
router.delete('/inventory/:id', inventoryController.deleteInventoryItem);

export const inventoryRouter = router;
export default router;
