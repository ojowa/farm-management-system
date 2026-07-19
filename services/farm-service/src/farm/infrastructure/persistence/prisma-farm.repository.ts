import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { FarmRepository, FieldRepository } from '../../domain/repositories/farm.repository';
import { Farm, Field } from '../../domain/entities/farm.entity';

@Injectable()
export class PrismaFarmRepository implements FarmRepository {
  async findById(id: string): Promise<Farm | null> {
    return prisma.farm.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ farms: Farm[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = options || {};
    const skip = (page - 1) * limit;
    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        where: { organizationId },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.farm.count({ where: { organizationId } }),
    ]);
    return { farms, total };
  }

  async create(data: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm> {
    return prisma.farm.create({ data });
  }

  async update(id: string, data: Partial<Farm>): Promise<Farm> {
    return prisma.farm.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.farm.delete({ where: { id } });
  }

  async findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ farms: Farm[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = options || {};
    const skip = (page - 1) * limit;
    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.farm.count(),
    ]);
    return { farms, total };
  }
}

@Injectable()
export class PrismaFieldRepository implements FieldRepository {
  async findById(id: string): Promise<Field | null> {
    return prisma.field.findUnique({ where: { id } });
  }

  async findByFarmId(farmId: string): Promise<Field[]> {
    return prisma.field.findMany({ where: { farmId } });
  }

  async create(data: Omit<Field, 'id'>): Promise<Field> {
    return prisma.field.create({ data });
  }

  async update(id: string, data: Partial<Field>): Promise<Field> {
    return prisma.field.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.field.delete({ where: { id } });
  }
}
