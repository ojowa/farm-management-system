import { Request, Response } from 'express';
import { CropService } from './crop.service';
import { createCropSchema, updateCropSchema, createCropCycleSchema, updateCropCycleSchema } from '@farm/validation';

const cropService = new CropService();

export class CropController {
  // Crop Endpoints
  async createCrop(req: Request, res: Response) {
    try {
      const validatedData = createCropSchema.parse(req.body);
      const crop = await cropService.createCrop(validatedData);
      res.status(201).json(crop);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getCropById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const crop = await cropService.getCropById(id);
      res.json(crop);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllCrops(req: Request, res: Response) {
    try {
      const crops = await cropService.getAllCrops();
      res.json(crops);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateCrop(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateCropSchema.parse(req.body);
      const crop = await cropService.updateCrop(id, validatedData);
      res.json(crop);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteCrop(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await cropService.deleteCrop(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // CropCycle Endpoints
  async createCropCycle(req: Request, res: Response) {
    try {
      const validatedData = createCropCycleSchema.parse(req.body);
      const cycle = await cropService.createCropCycle(validatedData);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getCropCycleById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const cycle = await cropService.getCropCycleById(id);
      res.json(cycle);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllCropCycles(req: Request, res: Response) {
    try {
      const cycles = await cropService.getAllCropCycles();
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateCropCycle(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateCropCycleSchema.parse(req.body);
      const cycle = await cropService.updateCropCycle(id, validatedData);
      res.json(cycle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteCropCycle(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await cropService.deleteCropCycle(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }
}
