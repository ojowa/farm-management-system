import { scopedPrisma as prisma } from '@farm/database';

export class LivestockRepository {
  async createLivestock(data: {
    farmId: string;
    species: string;
    breed?: string | null;
    gender: string;
    birthDate: Date;
    status: string;
  }) {
    return prisma.livestock.create({ data });
  }

  async getLivestockById(id: string) {
    return prisma.livestock.findUnique({ where: { id } });
  }

  async getAllLivestock(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
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

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateLivestock(
    id: string,
    data: {
      farmId?: string;
      species?: string;
      breed?: string | null;
      gender?: string;
      birthDate?: Date;
      status?: string;
    }
  ) {
    return prisma.livestock.update({ where: { id }, data });
  }

  async deleteLivestock(id: string) {
    return prisma.livestock.delete({ where: { id } });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id } });
  }
}

