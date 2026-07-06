import { Router } from 'express';
import { FinanceController } from './finance.controller';

const router = Router();
const financeController = new FinanceController();

// Expense routes
router.get('/expenses', financeController.getAllExpenses);
router.get('/expenses/:id', financeController.getExpenseById);
router.post('/expenses', financeController.createExpense);
router.put('/expenses/:id', financeController.updateExpense);
router.delete('/expenses/:id', financeController.deleteExpense);

// Sale routes
router.get('/sales', financeController.getAllSales);
router.get('/sales/:id', financeController.getSaleById);
router.post('/sales', financeController.createSale);
router.put('/sales/:id', financeController.updateSale);
router.delete('/sales/:id', financeController.deleteSale);

export const financeRouter = router;
export default router;
