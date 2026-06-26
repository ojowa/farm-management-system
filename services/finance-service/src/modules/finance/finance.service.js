"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const finance_repository_1 = require("./finance.repository");
class FinanceService {
    repository = new finance_repository_1.FinanceRepository();
    async assertFarmExists(farmId) {
        const farm = await this.repository.getFarmById(farmId);
        if (!farm) {
            throw new Error(`Farm with ID ${farmId} not found`);
        }
    }
    toDate(value) {
        return typeof value === 'string' ? new Date(value) : value;
    }
    // --- Expense ---
    async createExpense(data) {
        await this.assertFarmExists(data.farmId);
        return this.repository.createExpense({
            farmId: data.farmId,
            title: data.title,
            amount: data.amount,
            date: this.toDate(data.date),
        });
    }
    async getExpenseById(id) {
        const expense = await this.repository.getExpenseById(id);
        if (!expense) {
            throw new Error(`Expense with ID ${id} not found`);
        }
        return expense;
    }
    async getAllExpenses() {
        return this.repository.getAllExpenses();
    }
    async updateExpense(id, data) {
        await this.getExpenseById(id);
        if (data.farmId) {
            await this.assertFarmExists(data.farmId);
        }
        return this.repository.updateExpense(id, {
            ...data,
            date: data.date ? this.toDate(data.date) : undefined,
        });
    }
    async deleteExpense(id) {
        await this.getExpenseById(id);
        return this.repository.deleteExpense(id);
    }
    // --- Sale ---
    async createSale(data) {
        await this.assertFarmExists(data.farmId);
        return this.repository.createSale({
            farmId: data.farmId,
            item: data.item,
            quantity: data.quantity,
            price: data.price,
            total: data.total,
            date: this.toDate(data.date),
        });
    }
    async getSaleById(id) {
        const sale = await this.repository.getSaleById(id);
        if (!sale) {
            throw new Error(`Sale with ID ${id} not found`);
        }
        return sale;
    }
    async getAllSales() {
        return this.repository.getAllSales();
    }
    async updateSale(id, data) {
        await this.getSaleById(id);
        if (data.farmId) {
            await this.assertFarmExists(data.farmId);
        }
        return this.repository.updateSale(id, {
            ...data,
            date: data.date ? this.toDate(data.date) : undefined,
        });
    }
    async deleteSale(id) {
        await this.getSaleById(id);
        return this.repository.deleteSale(id);
    }
}
exports.FinanceService = FinanceService;
