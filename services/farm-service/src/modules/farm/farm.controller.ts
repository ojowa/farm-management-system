import { Request, Response } from 'express';
import { FarmService } from './farm.service';
import { createFarmSchema, updateFarmSchema, createFieldSchema, updateFieldSchema } from '@farm/validation';

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
      // Extract query parameters for filtering, sorting, and pagination
      const filter: any = {};
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = (req.query.sortOrder as string || 'desc') === 'asc' ? 'asc' : 'desc';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Build filter object from query parameters
      if (req.query.organizationId) {
        filter.organizationId = req.query.organizationId as string;
      }

      if (req.query.farmType) {
        filter.farmType = req.query.farmType as string;
      }

      if (req.query.name) {
        filter.name = req.query.name as string;
      }

      if (req.query.location) {
        filter.location = req.query.location as string;
      }
      
      const result = await farmService.getAllFarms(filter, sortBy, sortOrder, page, limit);
      res.json(result);
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

  // Field endpoints
  async createField(req: Request, res: Response) {
    try {
      const validatedData = createFieldSchema.parse(req.body);
      const field = await farmService.createField(validatedData);
      res.status(201).json(field);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getFieldById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const field = await farmService.getFieldById(id);
      res.json(field);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllFields(req: Request, res: Response) {
    try {
      // Extract query parameters for filtering, sorting, and pagination
      const filter: any = {};
      const sortBy = req.query.sortBy as string || 'name';
      const sortOrder = (req.query.sortOrder as string || 'asc') === 'asc' ? 'asc' : 'desc';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Build filter object from query parameters
      if (req.query.farmId) {
        filter.farmId = req.query.farmId as string;
      }
      
      if (req.query.name) {
        filter.name = req.query.name as string;
      }
      
      const result = await farmService.getAllFields(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateField(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateFieldSchema.parse(req.body);
      const field = await farmService.updateField(id, validatedData);
      res.json(field);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteField(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await farmService.deleteField(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }
}

