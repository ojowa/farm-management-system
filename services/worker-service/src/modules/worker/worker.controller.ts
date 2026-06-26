import { Request, Response } from 'express';
import { WorkerService } from './worker.service';
import { createWorkerSchema, updateWorkerSchema } from '@farm/validation';

const workerService = new WorkerService();

export class WorkerController {
  async createWorker(req: Request, res: Response) {
    try {
      const validatedData = createWorkerSchema.parse(req.body);
      const worker = await workerService.createWorker(validatedData);
      res.status(201).json(worker);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async getWorkerById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const worker = await workerService.getWorkerById(id);
      res.json(worker);
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async getAllWorkers(req: Request, res: Response) {
    try {
      const workers = await workerService.getAllWorkers();
      res.json(workers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async updateWorker(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validatedData = updateWorkerSchema.parse(req.body);
      const worker = await workerService.updateWorker(id, validatedData);
      res.json(worker);
    } catch (error: any) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async deleteWorker(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await workerService.deleteWorker(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message || error });
    }
  }
}

