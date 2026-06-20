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

  async getAllCrops() {
    return prisma.crop.findMany();
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
