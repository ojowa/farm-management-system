import { prisma } from '@farm/database';

export class InventoryRepository {
  async createInventoryItem(data: {
    farmId: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
  }) {
    return prisma.inventory.create({ data });
  }

  async getInventoryItemById(id: string) {
    return prisma.inventory.findUnique({ where: { id } });
  }

  async getAllInventoryItems() {
    return prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateInventoryItem(
    id: string,
    data: {
      farmId?: string;
      name?: string;
      category?: string;
      quantity?: number;
      unit?: string;
    }
  ) {
    return prisma.inventory.update({ where: { id }, data });
  }

  async deleteInventoryItem(id: string) {
    return prisma.inventory.delete({ where: { id } });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id } });
  }
}

