import { Request, Response } from 'express';
import { FarmService } from './farm.service';
import { createFarmSchema, updateFarmSchema } from '@farm/validation';

const farmService = new FarmService();

export class FarmController {
  async createFarm(req: Request, res: Response) {
    try {
      const validatedData = createFarmSchema.parse(req.body);
      const farm = await farmService.createFarm(validatedData);
      res.status(201).json(farm);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getFarmById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const farm = await farmService.getFarmById(id);
      res.json(farm);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllFarms(req: Request, res: Response) {
    try {
      const farms = await farmService.getAllFarms();
      res.json(farms);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateFarm(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateFarmSchema.parse(req.body);
      const farm = await farmService.updateFarm(id, validatedData);
      res.json(farm);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteFarm(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await farmService.deleteFarm(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }
}
