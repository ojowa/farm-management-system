import { prisma } from '@farm/database';

export class FarmRepository {
  async createFarm(data: {
    organizationId: string;
    name: string;
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

  async getAllFarms() {
    return prisma.farm.findMany({
      include: {
        fields: true,
        poultryHouses: true,
      },
    });
  }

  async updateFarm(
    id: string,
    data: {
      organizationId?: string;
      name?: string;
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
}
