import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import {
  AquacultureRepository,
  PondFilter,
  PondListOptions,
  PondWrite,
  PondStockingWrite,
  PondFeedingWrite,
  PondWaterQualityWrite,
  PondHarvestWrite,
} from '../../domain/repositories/aquaculture.repository';
import {
  Pond,
  PondStocking,
  PondFeeding,
  PondWaterQuality,
  PondHarvest,
} from '../../domain/entities/aquaculture.entity';

@Injectable()
export class PrismaAquacultureRepository implements AquacultureRepository {
  // ── Ponds ────────────────────────────────────────────────────────────
  async findPondById(id: string, organizationId: string): Promise<Pond | null> {
    return prisma.pond.findFirst({ where: { id, organizationId } });
  }

  async findAllPonds(filter: PondFilter, options?: PondListOptions): Promise<{ data: Pond[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where: any = { organizationId: filter.organizationId };

    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { pondType: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pond.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.pond.count({ where }),
    ]);

    return { data, total };
  }

  async createPond(data: PondWrite): Promise<Pond> {
    return prisma.pond.create({ data: data as any });
  }

  async updatePond(id: string, data: Partial<Pond>): Promise<Pond> {
    return prisma.pond.update({ where: { id }, data });
  }

  async deletePond(id: string): Promise<void> {
    await prisma.pond.delete({ where: { id } });
  }

  async getFarmById(id: string, organizationId: string) {
    if (!organizationId) return null;
    return prisma.farm.findFirst({ where: { id, organizationId }, select: { id: true } });
  }

  // ── Stockings ────────────────────────────────────────────────────────
  async findStockingById(id: string, organizationId: string): Promise<PondStocking | null> {
    return prisma.pondStocking.findFirst({ where: { id, organizationId } });
  }

  async listStockings(pondId: string, organizationId: string): Promise<PondStocking[]> {
    return prisma.pondStocking.findMany({
      where: { pondId, organizationId },
      orderBy: { stockedAt: 'desc' },
    });
  }

  async createStocking(data: PondStockingWrite): Promise<PondStocking> {
    return prisma.pondStocking.create({ data: data as any });
  }

  async updateStocking(id: string, data: Partial<PondStocking>): Promise<PondStocking> {
    return prisma.pondStocking.update({ where: { id }, data });
  }

  async deleteStocking(id: string): Promise<void> {
    await prisma.pondStocking.delete({ where: { id } });
  }

  // ── Feedings ─────────────────────────────────────────────────────────
  async findFeedingById(id: string, organizationId: string): Promise<PondFeeding | null> {
    return prisma.pondFeeding.findFirst({ where: { id, organizationId } });
  }

  async listFeedings(pondId: string, organizationId: string): Promise<PondFeeding[]> {
    return prisma.pondFeeding.findMany({
      where: { pondId, organizationId },
      orderBy: { fedAt: 'desc' },
    });
  }

  async createFeeding(data: PondFeedingWrite): Promise<PondFeeding> {
    return prisma.pondFeeding.create({ data: data as any });
  }

  async deleteFeeding(id: string): Promise<void> {
    await prisma.pondFeeding.delete({ where: { id } });
  }

  // ── Water quality ────────────────────────────────────────────────────
  async findWaterQualityById(id: string, organizationId: string): Promise<PondWaterQuality | null> {
    return prisma.pondWaterQuality.findFirst({ where: { id, organizationId } });
  }

  async listWaterQuality(pondId: string, organizationId: string): Promise<PondWaterQuality[]> {
    return prisma.pondWaterQuality.findMany({
      where: { pondId, organizationId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async createWaterQuality(data: PondWaterQualityWrite): Promise<PondWaterQuality> {
    return prisma.pondWaterQuality.create({ data: data as any });
  }

  async deleteWaterQuality(id: string): Promise<void> {
    await prisma.pondWaterQuality.delete({ where: { id } });
  }

  // ── Harvests ─────────────────────────────────────────────────────────
  async findHarvestById(id: string, organizationId: string): Promise<PondHarvest | null> {
    return prisma.pondHarvest.findFirst({ where: { id, organizationId } });
  }

  async listHarvests(pondId: string, organizationId: string): Promise<PondHarvest[]> {
    return prisma.pondHarvest.findMany({
      where: { pondId, organizationId },
      orderBy: { harvestedAt: 'desc' },
    });
  }

  async createHarvest(data: PondHarvestWrite): Promise<PondHarvest> {
    return prisma.pondHarvest.create({ data: data as any });
  }

  async deleteHarvest(id: string): Promise<void> {
    await prisma.pondHarvest.delete({ where: { id } });
  }
}
