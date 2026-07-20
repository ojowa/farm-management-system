import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import {
  LivestockRepository,
  HealthRecordRepository,
  BreedingRecordRepository,
  WeightRecordRepository,
  VaccinationScheduleRepository,
  LivestockFilter,
} from '../../domain/repositories/livestock.repository';
import {
  Livestock,
  HealthRecord,
  BreedingRecord,
  WeightRecord,
  VaccinationSchedule,
} from '../../domain/entities/livestock.entity';

@Injectable()
export class PrismaLivestockRepository implements LivestockRepository {
  async findById(id: string): Promise<Livestock | null> {
    return prisma.livestock.findUnique({ where: { id } });
  }

  async findAll(filter: LivestockFilter, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Livestock[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.species) where.species = filter.species;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { species: { contains: filter.search, mode: 'insensitive' } },
        { breed: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.livestock.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.livestock.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Omit<Livestock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Livestock> {
    return prisma.livestock.create({ data: data as any });
  }

  async update(id: string, data: Partial<Livestock>): Promise<Livestock> {
    return prisma.livestock.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.livestock.delete({ where: { id } });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id }, select: { id: true } });
  }
}

@Injectable()
export class PrismaHealthRecordRepository implements HealthRecordRepository {
  async findByLivestockId(livestockId: string, organizationId: string): Promise<HealthRecord[]> {
    return prisma.healthRecord.findMany({
      where: { livestockId, organizationId },
      orderBy: { date: 'desc' },
    });
  }

  async create(data: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> {
    return prisma.healthRecord.create({ data });
  }

  async update(id: string, data: Partial<HealthRecord>): Promise<HealthRecord> {
    return prisma.healthRecord.update({ where: { id }, data });
  }
}

@Injectable()
export class PrismaBreedingRecordRepository implements BreedingRecordRepository {
  async findAll(organizationId: string, filter?: { status?: string }): Promise<BreedingRecord[]> {
    const where: any = { organizationId };
    if (filter?.status) where.status = filter.status;
    return prisma.breedingRecord.findMany({ where, orderBy: { breedingDate: 'desc' } });
  }

  async findUpcoming(organizationId: string): Promise<BreedingRecord[]> {
    return prisma.breedingRecord.findMany({
      where: {
        organizationId,
        status: { in: ['BRED', 'CONFIRMED'] },
        expectedDueDate: { gte: new Date() },
      },
      orderBy: { expectedDueDate: 'asc' },
    });
  }

  async create(data: Omit<BreedingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BreedingRecord> {
    return prisma.breedingRecord.create({ data });
  }

  async update(id: string, data: Partial<BreedingRecord>): Promise<BreedingRecord> {
    return prisma.breedingRecord.update({ where: { id }, data });
  }
}

@Injectable()
export class PrismaWeightRecordRepository implements WeightRecordRepository {
  async findByLivestockId(livestockId: string, organizationId: string): Promise<WeightRecord[]> {
    return prisma.weightRecord.findMany({
      where: { livestockId, organizationId },
      orderBy: { recordedDate: 'desc' },
    });
  }

  async findByFlockId(flockId: string, organizationId: string): Promise<WeightRecord[]> {
    return prisma.weightRecord.findMany({
      where: { flockId, organizationId },
      orderBy: { recordedDate: 'desc' },
    });
  }

  async create(data: Omit<WeightRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeightRecord> {
    return prisma.weightRecord.create({ data });
  }
}

@Injectable()
export class PrismaVaccinationScheduleRepository implements VaccinationScheduleRepository {
  async findByLivestockId(livestockId: string, organizationId: string): Promise<VaccinationSchedule[]> {
    return prisma.vaccinationSchedule.findMany({
      where: { livestockId, organizationId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findOverdue(organizationId: string): Promise<VaccinationSchedule[]> {
    return prisma.vaccinationSchedule.findMany({
      where: {
        organizationId,
        status: 'SCHEDULED',
        scheduledDate: { lt: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async create(data: Omit<VaccinationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaccinationSchedule> {
    return prisma.vaccinationSchedule.create({ data });
  }

  async update(id: string, data: Partial<VaccinationSchedule>): Promise<VaccinationSchedule> {
    return prisma.vaccinationSchedule.update({ where: { id }, data });
  }
}
