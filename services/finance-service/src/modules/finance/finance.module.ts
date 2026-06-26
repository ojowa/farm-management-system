import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const financeController = new FinanceController();

// Expense routes
router.get(
  '/expenses',
  authMiddleware({ permission: 'finance.read' }),
  financeController.getAllExpenses,
);
router.get(
  '/expenses/:id',
  authMiddleware({ permission: 'finance.read' }),
  financeController.getExpenseById,
);
router.post(
  '/expenses',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }),
  financeController.createExpense,
);
router.put(
  '/expenses/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }),
  financeController.updateExpense,
);
router.delete(
  '/expenses/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'], permission: 'finance.delete' }),
  financeController.deleteExpense,
);

// Sale routes
router.get(
  '/sales',
  authMiddleware({ permission: 'finance.read' }),
  financeController.getAllSales,
);
router.get(
  '/sales/:id',
  authMiddleware({ permission: 'finance.read' }),
  financeController.getSaleById,
);
router.post(
  '/sales',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }),
  financeController.createSale,
);
router.put(
  '/sales/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }),
  financeController.updateSale,
);
router.delete(
  '/sales/:id',
  authMiddleware({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'], permission: 'finance.delete' }),
  financeController.deleteSale,
);

export const financeRouter = router;
export default router;
