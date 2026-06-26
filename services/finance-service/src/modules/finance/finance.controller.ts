import { Request, Response } from 'express';
import { FinanceService } from './finance.service';
import {
  createExpenseSchema,
  updateExpenseSchema,
  createSaleSchema,
  updateSaleSchema,
} from '@farm/validation';

const financeService = new FinanceService();

export class FinanceController {
  // --- Expense ---
  async createExpense(req: Request, res: Response) {
    try {
      const validated = createExpenseSchema.parse(req.body);
      const expense = await financeService.createExpense(validated);
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getExpenseById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const expense = await financeService.getExpenseById(id);
      res.json(expense);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllExpenses(req: Request, res: Response) {
    try {
      const expenses = await financeService.getAllExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateExpense(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validated = updateExpenseSchema.parse(req.body);
      const expense = await financeService.updateExpense(id, validated);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteExpense(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await financeService.deleteExpense(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  // --- Sale ---
  async createSale(req: Request, res: Response) {
    try {
      const validated = createSaleSchema.parse(req.body);
      const sale = await financeService.createSale(validated);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getSaleById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const sale = await financeService.getSaleById(id);
      res.json(sale);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllSales(req: Request, res: Response) {
    try {
      const sales = await financeService.getAllSales();
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateSale(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validated = updateSaleSchema.parse(req.body);
      const sale = await financeService.updateSale(id, validated);
      res.json(sale);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteSale(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await financeService.deleteSale(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }
}

