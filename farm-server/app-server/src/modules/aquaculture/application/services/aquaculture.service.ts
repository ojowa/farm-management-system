import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  AquacultureRepository,
  PondFilter,
  PondListOptions,
} from '../../domain/repositories/aquaculture.repository';
import {
  Pond,
  PondStocking,
  PondFeeding,
  PondWaterQuality,
  PondHarvest,
} from '../../domain/entities/aquaculture.entity';

export interface PondInput {
  farmId: string;
  name: string;
  pondType?: string;
  area?: number | null;
  waterSource?: string | null;
  capacity?: number | null;
  status?: string;
  notes?: string | null;
}

export interface StockingInput {
  species: string;
  strain?: string | null;
  count: number;
  source?: string | null;
  totalCost?: number | null;
  stockedAt: Date | string;
  expectedHarvestAt?: Date | string | null;
  status?: string;
  notes?: string | null;
}

export interface FeedingInput {
  feedType: string;
  quantityKg: number;
  cost?: number | null;
  fedAt: Date | string;
  notes?: string | null;
  stockingId?: string | null;
}

export interface WaterQualityInput {
  ph?: number | null;
  temperatureC?: number | null;
  dissolvedOxygen?: number | null;
  ammonia?: number | null;
  turbidity?: number | null;
  recordedAt: Date | string;
  notes?: string | null;
}

export interface HarvestInput {
  quantityKg: number;
  count?: number | null;
  unitPrice?: number | null;
  revenue?: number | null;
  harvestedAt: Date | string;
  notes?: string | null;
  stockingId?: string | null;
}

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function toNullableDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return toDate(value);
}

/** Rounds to 2 decimal places so money doesn't accumulate float dust. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class AquacultureApplicationService {
  constructor(
    @Inject('AquacultureRepository') private readonly aquacultureRepo: AquacultureRepository,
  ) {}

  private requireOrg(organizationId: string): void {
    if (!organizationId) throw new ForbiddenException('No organization context');
  }

  private async assertFarm(organizationId: string, farmId: string): Promise<void> {
    const farm = await this.aquacultureRepo.getFarmById(farmId, organizationId);
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found`);
  }

  private async assertPond(organizationId: string, pondId: string): Promise<Pond> {
    const pond = await this.aquacultureRepo.findPondById(pondId, organizationId);
    if (!pond) throw new NotFoundException(`Pond with ID ${pondId} not found`);
    return pond;
  }

  // ── Ponds ────────────────────────────────────────────────────────────

  async createPond(organizationId: string, data: PondInput): Promise<Pond> {
    this.requireOrg(organizationId);
    await this.assertFarm(organizationId, data.farmId);

    return this.aquacultureRepo.createPond({
      // Tenancy always comes from the JWT, never from the request body.
      organizationId,
      farmId: data.farmId,
      name: data.name,
      pondType: data.pondType ?? 'FISH',
      area: data.area ?? null,
      waterSource: data.waterSource ?? null,
      capacity: data.capacity ?? null,
      status: data.status ?? 'active',
      notes: data.notes ?? null,
    });
  }

  async getAllPonds(
    organizationId: string,
    filter: Omit<PondFilter, 'organizationId'>,
    options?: PondListOptions,
  ): Promise<{ data: Pond[]; total: number }> {
    this.requireOrg(organizationId);
    return this.aquacultureRepo.findAllPonds({ ...filter, organizationId }, options);
  }

  async getPondById(organizationId: string, id: string): Promise<Pond> {
    this.requireOrg(organizationId);
    return this.assertPond(organizationId, id);
  }

  async updatePond(organizationId: string, id: string, data: Partial<PondInput>): Promise<Pond> {
    await this.assertPond(organizationId, id);
    if (data.farmId) await this.assertFarm(organizationId, data.farmId);

    const updateData: any = { ...data };
    // A pond can never change tenancy.
    delete updateData.organizationId;

    return this.aquacultureRepo.updatePond(id, updateData);
  }

  async deletePond(organizationId: string, id: string): Promise<void> {
    await this.assertPond(organizationId, id);
    await this.aquacultureRepo.deletePond(id);
  }

  // ── Stockings ────────────────────────────────────────────────────────

  async listStockings(organizationId: string, pondId: string): Promise<PondStocking[]> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    return this.aquacultureRepo.listStockings(pondId, organizationId);
  }

  async createStocking(
    organizationId: string,
    pondId: string,
    data: StockingInput,
  ): Promise<PondStocking> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);

    return this.aquacultureRepo.createStocking({
      organizationId,
      pondId,
      species: data.species,
      strain: data.strain ?? null,
      count: data.count,
      source: data.source ?? null,
      totalCost: data.totalCost ?? null,
      stockedAt: toDate(data.stockedAt),
      expectedHarvestAt: toNullableDate(data.expectedHarvestAt),
      status: data.status ?? 'ongoing',
      notes: data.notes ?? null,
    });
  }

  async updateStocking(
    organizationId: string,
    id: string,
    data: Partial<StockingInput>,
  ): Promise<PondStocking> {
    const existing = await this.aquacultureRepo.findStockingById(id, organizationId);
    if (!existing) throw new NotFoundException(`Stocking with ID ${id} not found`);

    const updateData: any = { ...data };
    delete updateData.organizationId;
    delete updateData.pondId;
    if (data.stockedAt) updateData.stockedAt = toDate(data.stockedAt);
    if (data.expectedHarvestAt !== undefined) {
      updateData.expectedHarvestAt = toNullableDate(data.expectedHarvestAt);
    }

    return this.aquacultureRepo.updateStocking(id, updateData);
  }

  async deleteStocking(organizationId: string, id: string): Promise<void> {
    const existing = await this.aquacultureRepo.findStockingById(id, organizationId);
    if (!existing) throw new NotFoundException(`Stocking with ID ${id} not found`);
    await this.aquacultureRepo.deleteStocking(id);
  }

  // ── Feedings ─────────────────────────────────────────────────────────

  async listFeedings(organizationId: string, pondId: string): Promise<PondFeeding[]> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    return this.aquacultureRepo.listFeedings(pondId, organizationId);
  }

  async createFeeding(
    organizationId: string,
    pondId: string,
    data: FeedingInput,
  ): Promise<PondFeeding> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    if (data.stockingId) {
      // A4: the stocking must belong to THIS pond, not merely to the same
      // organization — otherwise a feeding could be booked against another
      // pond's stock in the same org.
      const stocking = await this.aquacultureRepo.findStockingById(
        data.stockingId,
        organizationId,
      );
      if (!stocking) throw new NotFoundException(`Stocking with ID ${data.stockingId} not found`);
      if (stocking.pondId !== pondId) {
        throw new NotFoundException(
          `Stocking with ID ${data.stockingId} does not belong to pond ${pondId}`,
        );
      }
    }

    return this.aquacultureRepo.createFeeding({
      organizationId,
      pondId,
      stockingId: data.stockingId ?? null,
      feedType: data.feedType,
      quantityKg: data.quantityKg,
      cost: data.cost ?? null,
      fedAt: toDate(data.fedAt),
      notes: data.notes ?? null,
    });
  }

  async deleteFeeding(organizationId: string, id: string): Promise<void> {
    const existing = await this.aquacultureRepo.findFeedingById(id, organizationId);
    if (!existing) throw new NotFoundException(`Feeding record with ID ${id} not found`);
    await this.aquacultureRepo.deleteFeeding(id);
  }

  // ── Water quality ────────────────────────────────────────────────────

  async listWaterQuality(organizationId: string, pondId: string): Promise<PondWaterQuality[]> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    return this.aquacultureRepo.listWaterQuality(pondId, organizationId);
  }

  async createWaterQuality(
    organizationId: string,
    pondId: string,
    data: WaterQualityInput,
  ): Promise<PondWaterQuality> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);

    return this.aquacultureRepo.createWaterQuality({
      organizationId,
      pondId,
      ph: data.ph ?? null,
      temperatureC: data.temperatureC ?? null,
      dissolvedOxygen: data.dissolvedOxygen ?? null,
      ammonia: data.ammonia ?? null,
      turbidity: data.turbidity ?? null,
      recordedAt: toDate(data.recordedAt),
      notes: data.notes ?? null,
    });
  }

  async deleteWaterQuality(organizationId: string, id: string): Promise<void> {
    const existing = await this.aquacultureRepo.findWaterQualityById(id, organizationId);
    if (!existing) throw new NotFoundException(`Water quality record with ID ${id} not found`);
    await this.aquacultureRepo.deleteWaterQuality(id);
  }

  // ── Harvests ─────────────────────────────────────────────────────────

  async listHarvests(organizationId: string, pondId: string): Promise<PondHarvest[]> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    return this.aquacultureRepo.listHarvests(pondId, organizationId);
  }

  async createHarvest(
    organizationId: string,
    pondId: string,
    data: HarvestInput,
  ): Promise<PondHarvest> {
    this.requireOrg(organizationId);
    await this.assertPond(organizationId, pondId);
    let stocking: PondStocking | null = null;
    if (data.stockingId) {
      // A4: the stocking must belong to THIS pond, not merely to the same
      // organization — otherwise a harvest could be booked against another
      // pond's stock in the same org.
      stocking = await this.aquacultureRepo.findStockingById(
        data.stockingId,
        organizationId,
      );
      if (!stocking) throw new NotFoundException(`Stocking with ID ${data.stockingId} not found`);
      if (stocking.pondId !== pondId) {
        throw new NotFoundException(
          `Stocking with ID ${data.stockingId} does not belong to pond ${pondId}`,
        );
      }
    }

    // A2: recompute revenue server-side when a unit price is supplied, so a
    // client can't post a harvest with an inflated/deflated revenue figure
    // that doesn't match quantityKg × unitPrice. Only fall back to the
    // client-provided revenue when no unit price is given (e.g. a rough
    // estimate recorded offline).
    let revenue = data.revenue ?? null;
    if (data.unitPrice != null) {
      revenue = round2(data.quantityKg * data.unitPrice);
    }

    return this.aquacultureRepo.createHarvest({
      organizationId,
      pondId,
      stockingId: data.stockingId ?? null,
      quantityKg: data.quantityKg,
      count: data.count ?? null,
      unitPrice: data.unitPrice ?? null,
      revenue,
      harvestedAt: toDate(data.harvestedAt),
      notes: data.notes ?? null,
    });
  }

  async deleteHarvest(organizationId: string, id: string): Promise<void> {
    const existing = await this.aquacultureRepo.findHarvestById(id, organizationId);
    if (!existing) throw new NotFoundException(`Harvest record with ID ${id} not found`);
    await this.aquacultureRepo.deleteHarvest(id);
  }
}
