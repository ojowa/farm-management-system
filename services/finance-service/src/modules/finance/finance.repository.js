"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceRepository = void 0;
const database_1 = require("@farm/database");
class FinanceRepository {
    // --- Expense CRUD ---
    async createExpense(data) {
        return database_1.prisma.expense.create({ data });
    }
    async getExpenseById(id) {
        return database_1.prisma.expense.findUnique({ where: { id } });
    }
    async getAllExpenses() {
        return database_1.prisma.expense.findMany({ orderBy: { date: 'desc' } });
    }
    async updateExpense(id, data) {
        return database_1.prisma.expense.update({ where: { id }, data });
    }
    async deleteExpense(id) {
        return database_1.prisma.expense.delete({ where: { id } });
    }
    // --- Sale CRUD ---
    async createSale(data) {
        return database_1.prisma.sale.create({ data });
    }
    async getSaleById(id) {
        return database_1.prisma.sale.findUnique({ where: { id } });
    }
    async getAllSales() {
        return database_1.prisma.sale.findMany({ orderBy: { date: 'desc' } });
    }
    async updateSale(id, data) {
        return database_1.prisma.sale.update({ where: { id }, data });
    }
    async deleteSale(id) {
        return database_1.prisma.sale.delete({ where: { id } });
    }
    // --- Cross-entity helpers ---
    async getFarmById(id) {
        return database_1.prisma.farm.findUnique({ where: { id } });
    }
}
exports.FinanceRepository = FinanceRepository;
