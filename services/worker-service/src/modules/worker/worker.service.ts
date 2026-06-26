import { WorkerRepository } from './worker.repository';
import { CreateWorkerRequest, UpdateWorkerRequest } from '@farm/types';

export class WorkerService {
  private repository = new WorkerRepository();

  async createWorker(data: CreateWorkerRequest) {
    return this.repository.createWorker(data);
  }

  async getWorkerById(id: string) {
    const worker = await this.repository.getWorkerById(id);
    if (!worker) {
      throw new Error(`Worker with ID ${id} not found`);
    }
    return worker;
  }

  async getAllWorkers() {
    return this.repository.getAllWorkers();
  }

  async updateWorker(id: string, data: UpdateWorkerRequest) {
    await this.getWorkerById(id);
    return this.repository.updateWorker(id, data);
  }

  async deleteWorker(id: string) {
    await this.getWorkerById(id);
    return this.repository.deleteWorker(id);
  }
}

