import { Request, Response } from 'express';
import { PoultryService } from './poultry.service';
import {
  createPoultryHouseSchema,
  updatePoultryHouseSchema,
  createPenSchema,
  updatePenSchema,
  createBreedSchema,
  updateBreedSchema,
  createFlockSchema,
  updateFlockSchema,
  createFeedingRecordSchema,
  updateFeedingRecordSchema,
  createVaccinationRecordSchema,
  updateVaccinationRecordSchema,
  createMortalityRecordSchema,
  updateMortalityRecordSchema
} from '@farm/validation';

const poultryService = new PoultryService();

export class PoultryController {
  // PoultryHouse endpoints
  async createPoultryHouse(req: Request, res: Response) {
    try {
      const validatedData = createPoultryHouseSchema.parse(req.body);
      const house = await poultryService.createPoultryHouse(validatedData);
      res.status(201).json(house);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getPoultryHouseById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const house = await poultryService.getPoultryHouseById(id);
      res.json(house);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllPoultryHouses(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.farmId) filter.farmId = req.query.farmId as string;
      if (req.query.name) filter.name = req.query.name as string;

      const result = await poultryService.getAllPoultryHouses(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updatePoultryHouse(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updatePoultryHouseSchema.parse(req.body);
      const house = await poultryService.updatePoultryHouse(id, validatedData);
      res.json(house);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deletePoultryHouse(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deletePoultryHouse(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // Pen endpoints
  async createPen(req: Request, res: Response) {
    try {
      const validatedData = createPenSchema.parse(req.body);
      const pen = await poultryService.createPen(validatedData);
      res.status(201).json(pen);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getPenById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const pen = await poultryService.getPenById(id);
      res.json(pen);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllPens(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.poultryHouseId) filter.poultryHouseId = req.query.poultryHouseId as string;
      if (req.query.name) filter.name = req.query.name as string;

      const result = await poultryService.getAllPens(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updatePen(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updatePenSchema.parse(req.body);
      const pen = await poultryService.updatePen(id, validatedData);
      res.json(pen);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deletePen(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deletePen(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // Breed endpoints
  async createBreed(req: Request, res: Response) {
    try {
      const validatedData = createBreedSchema.parse(req.body);
      const breed = await poultryService.createBreed(validatedData);
      res.status(201).json(breed);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getBreedById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const breed = await poultryService.getBreedById(id);
      res.json(breed);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllBreeds(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'name';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
      const filter: any = {};
      if (req.query.name) filter.name = req.query.name as string;
      if (req.query.birdType) filter.birdType = req.query.birdType as string;

      const result = await poultryService.getAllBreeds(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateBreed(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateBreedSchema.parse(req.body);
      const breed = await poultryService.updateBreed(id, validatedData);
      res.json(breed);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteBreed(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deleteBreed(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // Flock endpoints
  async createFlock(req: Request, res: Response) {
    try {
      const validatedData = createFlockSchema.parse(req.body);
      const flock = await poultryService.createFlock(validatedData);
      res.status(201).json(flock);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getFlockById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const flock = await poultryService.getFlockById(id);
      res.json(flock);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllFlocks(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.farmId) filter.farmId = req.query.farmId as string;
      if (req.query.penId) filter.penId = req.query.penId as string;
      if (req.query.breedId) filter.breedId = req.query.breedId as string;
      if (req.query.status) filter.status = req.query.status as string;
      if (req.query.search) filter.search = req.query.search as string;

      const result = await poultryService.getAllFlocks(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateFlock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateFlockSchema.parse(req.body);
      const flock = await poultryService.updateFlock(id, validatedData);
      res.json(flock);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteFlock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deleteFlock(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // FeedingRecord endpoints
  async createFeedingRecord(req: Request, res: Response) {
    try {
      const validatedData = createFeedingRecordSchema.parse(req.body);
      const record = await poultryService.createFeedingRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getFeedingRecordById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const record = await poultryService.getFeedingRecordById(id);
      res.json(record);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllFeedingRecords(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'date';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.flockId) filter.flockId = req.query.flockId as string;
      if (req.query.feedType) filter.feedType = req.query.feedType as string;

      const result = await poultryService.getAllFeedingRecords(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateFeedingRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateFeedingRecordSchema.parse(req.body);
      const record = await poultryService.updateFeedingRecord(id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteFeedingRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deleteFeedingRecord(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // VaccinationRecord endpoints
  async createVaccinationRecord(req: Request, res: Response) {
    try {
      const validatedData = createVaccinationRecordSchema.parse(req.body);
      const record = await poultryService.createVaccinationRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getVaccinationRecordById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const record = await poultryService.getVaccinationRecordById(id);
      res.json(record);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllVaccinationRecords(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'date';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.flockId) filter.flockId = req.query.flockId as string;
      if (req.query.vaccine) filter.vaccine = req.query.vaccine as string;

      const result = await poultryService.getAllVaccinationRecords(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateVaccinationRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateVaccinationRecordSchema.parse(req.body);
      const record = await poultryService.updateVaccinationRecord(id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteVaccinationRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deleteVaccinationRecord(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  // MortalityRecord endpoints
  async createMortalityRecord(req: Request, res: Response) {
    try {
      const validatedData = createMortalityRecordSchema.parse(req.body);
      const record = await poultryService.createMortalityRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getMortalityRecordById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const record = await poultryService.getMortalityRecordById(id);
      res.json(record);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllMortalityRecords(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'date';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.flockId) filter.flockId = req.query.flockId as string;

      const result = await poultryService.getAllMortalityRecords(filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateMortalityRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateMortalityRecordSchema.parse(req.body);
      const record = await poultryService.updateMortalityRecord(id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteMortalityRecord(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await poultryService.deleteMortalityRecord(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }
}
