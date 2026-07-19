import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { CropRepository, CropCycleRepository } from '../../domain/repositories/crop.repository';
import { Crop, CropCycle } from '../../domain/entities/crop.entity';

@Injectable()
export class PrismaCropRepository implements CropRepository {
  async findById(id: string): Promise<Crop | null> {
    return prisma.crop.findUnique({ where: { id } });
  }

  async findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { name?: string };
  }): Promise<{ crops: Crop[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10, filter = {} } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive' as const,
      };
    }

    const [crops, total] = await Promise.all([
      prisma.crop.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.crop.count({ where }),
    ]);

    return { crops, total };
  }

  async create(data: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>): Promise<Crop> {
    return prisma.crop.create({ data });
  }

  async update(id: string, data: Partial<Pick<Crop, 'name'>>): Promise<Crop> {
    return prisma.crop.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.crop.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaCropCycleRepository implements CropCycleRepository {
  async findById(id: string): Promise<CropCycle | null> {
    return prisma.cropCycle.findUnique({
      where: { id },
      include: { crop: true, field: true },
    });
  }

  async findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { fieldId?: string; cropId?: string; status?: string };
  }): Promise<{ cycles: CropCycle[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, filter = {} } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.fieldId) where.fieldId = filter.fieldId;
    if (filter.cropId) where.cropId = filter.cropId;
    if (filter.status) where.status = filter.status;

    const [cycles, total] = await Promise.all([
      prisma.cropCycle.findMany({
        where,
        include: { crop: true, field: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.cropCycle.count({ where }),
    ]);

    return { cycles, total };
  }

  async create(data: Omit<CropCycle, 'id' | 'createdAt' | 'updatedAt'>): Promise<CropCycle> {
    return prisma.cropCycle.create({
      data: {
        fieldId: data.fieldId,
        cropId: data.cropId,
        plantingDate: data.plantingDate,
        harvestDate: data.harvestDate,
        status: data.status,
      } as any,
      include: { crop: true, field: true },
    });
  }

  async update(id: string, data: Partial<Pick<CropCycle, 'fieldId' | 'cropId' | 'plantingDate' | 'harvestDate' | 'status'>>): Promise<CropCycle> {
    return prisma.cropCycle.update({
      where: { id },
      data,
      include: { crop: true, field: true },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.cropCycle.delete({ where: { id } });
  }
}
