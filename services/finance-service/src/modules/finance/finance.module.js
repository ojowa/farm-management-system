"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRouter = void 0;
const express_1 = require("express");
const finance_controller_1 = require("./finance.controller");
const express_2 = require("../../../../../packages/auth/src/express/index");
const router = (0, express_1.Router)();
const financeController = new finance_controller_1.FinanceController();
// Expense routes
router.get('/expenses', (0, express_2.authMiddleware)({ permission: 'finance.read' }), financeController.getAllExpenses);
router.get('/expenses/:id', (0, express_2.authMiddleware)({ permission: 'finance.read' }), financeController.getExpenseById);
router.post('/expenses', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }), financeController.createExpense);
router.put('/expenses/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }), financeController.updateExpense);
router.delete('/expenses/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'], permission: 'finance.delete' }), financeController.deleteExpense);
// Sale routes
router.get('/sales', (0, express_2.authMiddleware)({ permission: 'finance.read' }), financeController.getAllSales);
router.get('/sales/:id', (0, express_2.authMiddleware)({ permission: 'finance.read' }), financeController.getSaleById);
router.post('/sales', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }), financeController.createSale);
router.put('/sales/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'finance.write' }), financeController.updateSale);
router.delete('/sales/:id', (0, express_2.authMiddleware)({ roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'], permission: 'finance.delete' }), financeController.deleteSale);
exports.financeRouter = router;
exports.default = router;
