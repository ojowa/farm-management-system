import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkerRepository } from '../../domain/repositories/worker.repository';

@Injectable()
export class WorkerApplicationService {
  constructor(private readonly workerRepo: WorkerRepository) {}

  async createWorker(data: { farmId: string; name: string; role: string }) {
    return this.workerRepo.create(data);
  }

  async getWorkerById(id: string) {
    const worker = await this.workerRepo.findById(id);
    if (!worker) throw new NotFoundException(`Worker with ID ${id} not found`);
    return worker;
  }

  async getAllWorkers() {
    return this.workerRepo.findAll();
  }

  async updateWorker(id: string, data: Partial<{ farmId: string; name: string; role: string }>) {
    await this.getWorkerById(id);
    return this.workerRepo.update(id, data);
  }

  async deleteWorker(id: string) {
    await this.getWorkerById(id);
    return this.workerRepo.delete(id);
  }
}
