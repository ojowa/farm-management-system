"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const finance_service_1 = require("./finance.service");
const validation_1 = require("@farm/validation");
const financeService = new finance_service_1.FinanceService();
class FinanceController {
    // --- Expense ---
    async createExpense(req, res) {
        try {
            const validated = validation_1.createExpenseSchema.parse(req.body);
            const expense = await financeService.createExpense(validated);
            res.status(201).json(expense);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getExpenseById(req, res) {
        try {
            const id = req.params.id;
            const expense = await financeService.getExpenseById(id);
            res.json(expense);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllExpenses(req, res) {
        try {
            const expenses = await financeService.getAllExpenses();
            res.json(expenses);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateExpense(req, res) {
        try {
            const id = req.params.id;
            const validated = validation_1.updateExpenseSchema.parse(req.body);
            const expense = await financeService.updateExpense(id, validated);
            res.json(expense);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteExpense(req, res) {
        try {
            const id = req.params.id;
            await financeService.deleteExpense(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    // --- Sale ---
    async createSale(req, res) {
        try {
            const validated = validation_1.createSaleSchema.parse(req.body);
            const sale = await financeService.createSale(validated);
            res.status(201).json(sale);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getSaleById(req, res) {
        try {
            const id = req.params.id;
            const sale = await financeService.getSaleById(id);
            res.json(sale);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllSales(req, res) {
        try {
            const sales = await financeService.getAllSales();
            res.json(sales);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateSale(req, res) {
        try {
            const id = req.params.id;
            const validated = validation_1.updateSaleSchema.parse(req.body);
            const sale = await financeService.updateSale(id, validated);
            res.json(sale);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteSale(req, res) {
        try {
            const id = req.params.id;
            await financeService.deleteSale(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
}
exports.FinanceController = FinanceController;
