import { Worker } from '../entities/worker.entity';

export interface WorkerRepository {
  findById(id: string): Promise<Worker | null>;
  findAll(): Promise<Worker[]>;
  create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<Worker>;
  update(id: string, data: Partial<Worker>): Promise<Worker>;
  delete(id: string): Promise<void>;
}
