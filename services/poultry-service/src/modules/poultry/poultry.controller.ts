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
      const houses = await poultryService.getAllPoultryHouses();
      res.json(houses);
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
      const pens = await poultryService.getAllPens();
      res.json(pens);
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
      const breeds = await poultryService.getAllBreeds();
      res.json(breeds);
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
      const flocks = await poultryService.getAllFlocks();
      res.json(flocks);
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
      const records = await poultryService.getAllFeedingRecords();
      res.json(records);
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
      const records = await poultryService.getAllVaccinationRecords();
      res.json(records);
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
      const records = await poultryService.getAllMortalityRecords();
      res.json(records);
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
