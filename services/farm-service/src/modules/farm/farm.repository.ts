import { scopedPrisma as prisma } from '@farm/database';

export class FarmRepository {
  async createFarm(data: {
    organizationId: string;
    name: string;
    farmType: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    return prisma.farm.create({
      data,
      include: {
        fields: true,
        poultryHouses: true,
      },
    });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({
      where: { id },
      include: {
        fields: true,
        poultryHouses: true,
      },
    });
  }

  async getAllFarms(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter.organizationId) {
      where.organizationId = filter.organizationId;
    }

    if (filter.farmType) {
      where.farmType = filter.farmType;
    }

    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive' as const,
      };
    }

    if (filter.location) {
      where.location = {
        contains: filter.location,
        mode: 'insensitive' as const,
      };
    }

    const total = await prisma.farm.count({ where });
    const farms = await prisma.farm.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        fields: true,
        poultryHouses: true,
      },
    });

    return {
      data: farms,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateFarm(
    id: string,
    data: {
      organizationId?: string;
      name?: string;
      farmType?: string;
      location?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }
  ) {
    return prisma.farm.update({
      where: { id },
      data,
      include: {
        fields: true,
        poultryHouses: true,
      },
    });
  }

  async deleteFarm(id: string) {
    return prisma.farm.delete({
      where: { id },
    });
  }

  // --- Field CRUD ---
  async createField(data: { farmId: string; name: string; size: number }) {
    return prisma.field.create({
      data,
      include: { farm: true },
    });
  }

  async getFieldById(id: string) {
    return prisma.field.findUnique({
      where: { id },
      include: { farm: true },
    });
  }

  async getAllFields(filter: any = {}, sortBy: string = 'name', sortOrder: 'asc' | 'desc' = 'asc', page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter.farmId) {
      where.farmId = filter.farmId;
    }

    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive' as const,
      };
    }

    const total = await prisma.field.count({ where });
    const fields = await prisma.field.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { farm: true },
    });

    return {
      data: fields,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateField(id: string, data: { farmId?: string; name?: string; size?: number }) {
    return prisma.field.update({
      where: { id },
      data,
      include: { farm: true },
    });
  }

  async deleteField(id: string) {
    return prisma.field.delete({
      where: { id },
    });
  }
}
