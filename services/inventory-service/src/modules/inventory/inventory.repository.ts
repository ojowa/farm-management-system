import { scopedPrisma as prisma } from '@farm/database';

export class InventoryRepository {
  async createInventoryItem(data: { farmId: string; name: string; category: string; quantity: number; unit: string }) {
    return prisma.inventory.create({ data });
  }

  async getInventoryItemById(id: string) {
    return prisma.inventory.findUnique({ where: { id } });
  }

  async getAllInventoryItems(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.category) where.category = filter.category;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' as const } },
        { category: { contains: filter.search, mode: 'insensitive' as const } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.inventory.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.inventory.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateInventoryItem(id: string, data: any) {
    return prisma.inventory.update({ where: { id }, data });
  }

  async deleteInventoryItem(id: string) {
    return prisma.inventory.delete({ where: { id } });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id } });
  }
}
