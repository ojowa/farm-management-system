import { Request, Response } from 'express';
import { LivestockService } from './livestock.service';
import { createLivestockSchema, updateLivestockSchema } from '@farm/validation';

const livestockService = new LivestockService();

export class LivestockController {
  async createLivestock(req: Request, res: Response) {
    try {
      const validatedData = createLivestockSchema.parse(req.body);
      const livestock = await livestockService.createLivestock(validatedData);
      res.status(201).json(livestock);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getLivestockById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const livestock = await livestockService.getLivestockById(id);
      res.json(livestock);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllLivestock(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.farmId) filter.farmId = req.query.farmId as string;
      if (req.query.species) filter.species = req.query.species as string;
      if (req.query.status) filter.status = req.query.status as string;
      if (req.query.search) filter.search = req.query.search as string;

      const result = await livestockService.getAllLivestock(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateLivestock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateLivestockSchema.parse(req.body);
      const livestock = await livestockService.updateLivestock(id, validatedData);
      res.json(livestock);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteLivestock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await livestockService.deleteLivestock(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }
}

