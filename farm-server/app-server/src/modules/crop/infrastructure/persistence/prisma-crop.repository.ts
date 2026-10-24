import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { CropRepository, CropCycleRepository } from '../../domain/repositories/crop.repository';
import { Crop, CropCycle } from '../../domain/entities/crop.entity';
import { safeOrderBy } from '../../../../common/sort';

const CROP_SORTABLE = ['id', 'name', 'createdAt'] as const;
// plantingDate/harvestDate are the real columns; the old list had
// startDate/endDate (which don't exist on CropCycle) so calendar date sorts
// silently fell back.
const CROP_CYCLE_SORTABLE = ['id', 'status', 'health', 'plantingDate', 'harvestDate', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class PrismaCropRepository implements CropRepository {
  async findById(id: string): Promise<Crop | null> {
    return prisma.crop.findUnique({ where: { id } });
  }

  async findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { name?: string };
  }): Promise<{ crops: Crop[]; total: number }> {
    const { sortBy = 'name', sortOrder = 'desc', page = 1, limit = 10, filter = {} } = options || {};
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 10;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const skip = (safePage - 1) * safeLimit;

    const where: any = {};
    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive' as const,
      };
    }

    const [crops, total] = await Promise.all([
      prisma.crop.findMany({
        where,
        orderBy: safeOrderBy(sortBy, sortOrder, CROP_SORTABLE, 'name'),
        skip,
        take: safeLimit,
      }),
      prisma.crop.count({ where }),
    ]);

    return { crops, total };
  }

  async create(data: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>): Promise<Crop> {
    return prisma.crop.create({ data });
  }

  async update(id: string, data: Partial<Pick<Crop, 'name'>>): Promise<Crop> {
    return prisma.crop.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.crop.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaCropCycleRepository implements CropCycleRepository {
  async findById(id: string, organizationId: string): Promise<CropCycle | null> {
    const cycle = await prisma.cropCycle.findFirst({
      where: { id, organizationId },
      include: {
        crop: true,
        field: { include: { farm: { select: { id: true, name: true, deletedAt: true } } } },
      },
    });
    if (!cycle) return null;
    return {
      ...cycle,
      cropName: cycle.crop?.name ?? null,
      fieldName: cycle.field?.name ?? null,
      farmName: cycle.field?.farm?.name ?? null,
    };
  }

  async findAll(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { fieldId?: string; cropId?: string; status?: string; farmId?: string };
  }): Promise<{ cycles: CropCycle[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, filter = {} } = options || {};
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 20;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const skip = (safePage - 1) * safeLimit;

    const where: any = { organizationId };
    if (filter.fieldId) where.fieldId = filter.fieldId;
    if (filter.cropId) where.cropId = filter.cropId;
    if (filter.status) where.status = filter.status;
    // Cycles live on a field, which lives on a farm — farm filtering happens
    // through the relation (the calendar endpoint accepts farmId).
    if (filter.farmId) where.field = { farmId: filter.farmId };

    const [cycles, total] = await Promise.all([
      prisma.cropCycle.findMany({
        where,
        // S5: relation reads are soft-delete-aware at the top level only, so
        // filter the nested rows explicitly — a cycle on a soft-deleted field
        // (or farm) must not resurface through an include.
        include: {
          crop: true,
          field: { include: { farm: { select: { id: true, name: true, deletedAt: true } } } },
        },
        orderBy: safeOrderBy(sortBy, sortOrder, CROP_CYCLE_SORTABLE, 'createdAt'),
        skip,
        take: safeLimit,
      }),
      prisma.cropCycle.count({ where }),
    ]);

    return {
      cycles: cycles
        .filter((cycle: any) => cycle.field && !cycle.field.deletedAt && !cycle.field.farm?.deletedAt)
        .map((cycle: any) => ({
          ...cycle,
          cropName: cycle.crop?.name ?? null,
          fieldName: cycle.field?.name ?? null,
          farmName: cycle.field?.farm?.name ?? null,
        })),
      total,
    };
  }

  async create(data: Omit<CropCycle, 'id' | 'createdAt' | 'updatedAt'>): Promise<CropCycle> {
    return prisma.cropCycle.create({
      data: {
        organizationId: data.organizationId,
        fieldId: data.fieldId,
        cropId: data.cropId,
        plantingDate: data.plantingDate,
        harvestDate: data.harvestDate,
        // C5: the zod schema accepts `health` but the service/repository used
        // to drop it, so every cycle was silently created at the 100 default.
        health: data.health ?? 100,
        status: data.status,
      } as any,
      include: {
        crop: true,
        field: { include: { farm: { select: { id: true, name: true } } } },
      },
    });
  }

  async update(id: string, data: Partial<Pick<CropCycle, 'fieldId' | 'cropId' | 'plantingDate' | 'harvestDate' | 'health' | 'status'>>): Promise<CropCycle> {
    return prisma.cropCycle.update({
      where: { id },
      data: data as any,
      include: {
        crop: true,
        field: { include: { farm: { select: { id: true, name: true } } } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.cropCycle.delete({ where: { id } });
  }

  async fieldExistsInOrg(fieldId: string, organizationId: string): Promise<boolean> {
    if (!fieldId || !organizationId) return false;
    const field = await prisma.field.findFirst({
      where: { id: fieldId, farm: { organizationId } },
      select: { id: true },
    });
    return !!field;
  }
}
