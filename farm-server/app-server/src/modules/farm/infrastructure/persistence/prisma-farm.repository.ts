import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { FarmRepository, FieldRepository } from '../../domain/repositories/farm.repository';
import { Farm, Field, FieldWithFarm } from '../../domain/entities/farm.entity';

@Injectable()
export class PrismaFarmRepository implements FarmRepository {
  async findById(id: string, organizationId: string): Promise<Farm | null> {
    return prisma.farm.findFirst({ where: { id, organizationId } });
  }

  async findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    farmType?: string;
  }): Promise<{ farms: Farm[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10, search, status, farmType } = options || {};
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;
    if (farmType) where.farmType = farmType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.farm.count({ where }),
    ]);
    return { farms, total };
  }

  async create(data: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm> {
    return prisma.farm.create({ data });
  }

  async createMany(data: Array<Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Farm[]> {
    return prisma.$transaction(data.map((row) => prisma.farm.create({ data: row as any })));
  }

  async update(id: string, organizationId: string, data: Partial<Farm>): Promise<Farm> {
    return prisma.farm.update({ where: { id, organizationId }, data });
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await prisma.farm.delete({ where: { id, organizationId } });
  }
}

@Injectable()
export class PrismaFieldRepository implements FieldRepository {
  // The parcel name alone is ambiguous outside one farm (two farms can both
  // have "North"), so reads carry the parent farm for labelling.
  private readonly withFarm = { include: { farm: { select: { id: true, name: true } } } } as const;

  async findById(id: string, organizationId: string): Promise<FieldWithFarm | null> {
    return prisma.field.findFirst({ where: { id, farm: { organizationId } }, ...this.withFarm });
  }

  async findByFarmId(farmId: string, organizationId: string): Promise<FieldWithFarm[]> {
    return prisma.field.findMany({
      where: { farmId, farm: { organizationId } },
      ...this.withFarm,
    });
  }

  async findByOrganizationId(organizationId: string): Promise<FieldWithFarm[]> {
    return prisma.field.findMany({
      where: { farm: { organizationId } },
      orderBy: { name: 'asc' },
      ...this.withFarm,
    });
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
