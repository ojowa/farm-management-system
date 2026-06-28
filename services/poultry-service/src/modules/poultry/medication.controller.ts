import { Request, Response } from 'express';
import { MedicationService } from './medication.service';
import {
  createMedicationSchema,
  updateMedicationSchema,
} from '@farm/validation';

const medicationService = new MedicationService();

export class MedicationController {
  async createMedication(req: Request, res: Response) {
    try {
      const validatedData = createMedicationSchema.parse(req.body);
      const medication = await medicationService.create(validatedData);
      res.status(201).json(medication);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getMedicationById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const medication = await medicationService.getById(id);
      res.json(medication);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllMedications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const flockId = req.query.flockId as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await medicationService.getAll({
        page,
        limit,
        sortBy,
        sortOrder,
        flockId,
        status,
        search,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateMedication(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateMedicationSchema.parse(req.body);
      const medication = await medicationService.update(id, validatedData);
      res.json(medication);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteMedication(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await medicationService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }
}
