import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { createInventoryItemSchema, updateInventoryItemSchema } from '@farm/validation';

const inventoryService = new InventoryService();

export class InventoryController {
  async createInventoryItem(req: Request, res: Response) {
    try {
      const validated = createInventoryItemSchema.parse(req.body);
      const item = await inventoryService.createInventoryItem(validated);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getInventoryItemById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const item = await inventoryService.getInventoryItemById(id);
      res.json(item);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllInventoryItems(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.farmId) filter.farmId = req.query.farmId as string;
      if (req.query.category) filter.category = req.query.category as string;
      if (req.query.search) filter.search = req.query.search as string;

      const result = await inventoryService.getAllInventoryItems(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateInventoryItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validated = updateInventoryItemSchema.parse(req.body);
      const item = await inventoryService.updateInventoryItem(id, validated);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteInventoryItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await inventoryService.deleteInventoryItem(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }
}

