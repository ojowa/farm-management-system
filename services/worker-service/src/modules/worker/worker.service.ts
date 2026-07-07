import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkerRepository } from './worker.repository';

@Injectable()
export class WorkerService {
  constructor(private readonly repository: WorkerRepository) {}

  async createWorker(data: { farmId: string; name: string; role: string }) {
    return this.repository.createWorker(data);
  }

  async getWorkerById(id: string) {
    const worker = await this.repository.getWorkerById(id);
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${id} not found`);
    }
    return worker;
  }

  async getAllWorkers() {
    return this.repository.getAllWorkers();
  }

  async updateWorker(id: string, data: { farmId?: string; name?: string; role?: string }) {
    await this.getWorkerById(id);
    return this.repository.updateWorker(id, data);
  }

  async deleteWorker(id: string) {
    await this.getWorkerById(id);
    return this.repository.deleteWorker(id);
  }
}
