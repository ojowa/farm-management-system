import { prisma } from '@farm/database';

export class CropRepository {
  // Crop CRUD
  async createCrop(name: string) {
    return prisma.crop.create({
      data: { name },
    });
  }

  async getCropById(id: string) {
    return prisma.crop.findUnique({
      where: { id },
    });
  }

  async getAllCrops(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 10) {
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {};
    
    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive' as const
      };
    }
    
    // Get total count for pagination
    const total = await prisma.crop.count({ where });
    
    // Get paginated and filtered results
    const crops = await prisma.crop.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      },
    });
    
    return {
      data: crops,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateCrop(id: string, name: string) {
    return prisma.crop.update({
      where: { id },
      data: { name },
    });
  }

  async deleteCrop(id: string) {
    return prisma.crop.delete({
      where: { id },
    });
  }

  // CropCycle CRUD
  async createCropCycle(data: {
    fieldId: string;
    cropId: string;
    plantingDate: Date;
    harvestDate?: Date | null;
  }) {
    return prisma.cropCycle.create({
      data: {
        fieldId: data.fieldId,
        cropId: data.cropId,
        plantingDate: data.plantingDate,
        harvestDate: data.harvestDate,
      },
      include: {
        crop: true,
        field: true,
      },
    });
  }

  async getCropCycleById(id: string) {
    return prisma.cropCycle.findUnique({
      where: { id },
      include: {
        crop: true,
        field: true,
      },
    });
  }

  async getAllCropCycles() {
    return prisma.cropCycle.findMany({
      include: {
        crop: true,
        field: true,
      },
    });
  }

  async updateCropCycle(
    id: string,
    data: {
      fieldId?: string;
      cropId?: string;
      plantingDate?: Date;
      harvestDate?: Date | null;
    }
  ) {
    return prisma.cropCycle.update({
      where: { id },
      data: {
        fieldId: data.fieldId,
        cropId: data.cropId,
        plantingDate: data.plantingDate,
        harvestDate: data.harvestDate,
      },
      include: {
        crop: true,
        field: true,
      },
    });
  }

  async deleteCropCycle(id: string) {
    return prisma.cropCycle.delete({
      where: { id },
    });
  }
}
