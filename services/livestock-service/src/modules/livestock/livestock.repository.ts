import { prisma } from '@farm/database';

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

  async getAllLivestock() {
    return prisma.livestock.findMany({ orderBy: { createdAt: 'desc' } });
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

