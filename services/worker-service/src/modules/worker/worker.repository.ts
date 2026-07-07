import { scopedPrisma as prisma } from '@farm/database';

export class WorkerRepository {
  async createWorker(data: { farmId: string; name: string; role: string }) {
    return prisma.worker.create({ data });
  }

  async getWorkerById(id: string) {
    return prisma.worker.findUnique({ where: { id } });
  }

  async getAllWorkers() {
    return prisma.worker.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateWorker(id: string, data: { farmId?: string; name?: string; role?: string }) {
    return prisma.worker.update({ where: { id }, data });
  }

  async deleteWorker(id: string) {
    return prisma.worker.delete({ where: { id } });
  }
}
