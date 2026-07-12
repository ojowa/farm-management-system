import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { WorkerRepository } from '../../domain/repositories/worker.repository';
import { Worker } from '../../domain/entities/worker.entity';

@Injectable()
export class PrismaWorkerRepository implements WorkerRepository {
  async findById(id: string): Promise<Worker | null> {
    return prisma.worker.findUnique({ where: { id } }) as Promise<Worker | null>;
  }

  async findAll(): Promise<Worker[]> {
    return prisma.worker.findMany({ orderBy: { createdAt: 'desc' } }) as Promise<Worker[]>;
  }

  async create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<Worker> {
    return prisma.worker.create({ data }) as Promise<Worker>;
  }

  async update(id: string, data: Partial<Worker>): Promise<Worker> {
    return prisma.worker.update({ where: { id }, data }) as Promise<Worker>;
  }

  async delete(id: string): Promise<void> {
    await prisma.worker.delete({ where: { id } });
  }
}
