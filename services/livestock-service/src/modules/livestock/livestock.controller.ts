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
      const livestock = await livestockService.getAllLivestock();
      res.json(livestock);
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
      res.status(400).json({ error: error.message || error });
    }
  }
}
