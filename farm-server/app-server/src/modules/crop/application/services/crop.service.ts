import { Inject,  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { CropRepository, CropCycleRepository } from '../../domain/repositories/crop.repository';
import { CropEventService } from '../../infrastructure/messaging/crop.event.service';

function parseDate(value: Date | string | null | undefined, field: string): Date | null {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`"${field}" must be a valid date`);
  }
  return date;
}

/**
 * All organization scoping is derived from the CALLER (the controller passes
 * the JWT's organizationId). Client-supplied ids are never trusted as scope.
 */
@Injectable()
export class CropApplicationService {
  constructor(@Inject('CropRepository') private readonly cropRepo: CropRepository, @Inject('CropCycleRepository') private readonly cropCycleRepo: CropCycleRepository, 
    private readonly eventService: CropEventService) {}

  private requireOrg(organizationId: string): void {
    if (!organizationId) throw new ForbiddenException('No organization context');
  }

  async createCrop(data: { name: string }, organizationId: string) {
    this.requireOrg(organizationId);
    try {
      const crop = await this.cropRepo.create({ name: data.name }, organizationId);
      await this.eventService.emitCropCreatedEvent(crop);
      return crop;
    } catch (error) {
      // P2002: unique constraint on (organizationId, name) — duplicate crop name
      // within this org. Surface a ConflictException instead of a raw 500.
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'P2002') {
        throw new ConflictException(`A crop named "${data.name}" already exists in your organization.`);
      }
      throw error;
    }
  }

  async getCropById(id: string, organizationId: string) {
    const crop = await this.cropRepo.findById(id, organizationId);
    if (!crop) throw new NotFoundException(`Crop with ID ${id} not found`);
    return crop;
  }

  async getAllCrops(organizationId: string, options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { name?: string };
  } = {}) {
    return this.cropRepo.findAll(organizationId, options);
  }

  async updateCrop(id: string, organizationId: string, data: { name: string }) {
    await this.getCropById(id, organizationId);
    const updatedCrop = await this.cropRepo.update(id, organizationId, { name: data.name });
    await this.eventService.emitCropUpdatedEvent(updatedCrop);
    return updatedCrop;
  }

  async deleteCrop(id: string, organizationId: string) {
    await this.getCropById(id, organizationId);
    try {
      await this.cropRepo.delete(id, organizationId);
    } catch (error) {
      // Crop cycles reference the catalog row with no cascade — a crop that
      // is planted anywhere can't be removed. Surface that as a conflict
      // instead of a raw Prisma 500 (P2003).
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'P2003') {
        throw new ConflictException('Crop is in use by one or more crop cycles and cannot be removed.');
      }
      throw error;
    }
    // Only announce the deletion once the row is actually gone.
    await this.eventService.emitCropDeletedEvent(id, organizationId);
  }

  async createCropCycle(organizationId: string, data: {
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate?: Date | string | null;
    health?: number;
    status?: string;
  }) {
    this.requireOrg(organizationId);
    await this.getCropById(data.cropId, organizationId);
    if (!(await this.cropCycleRepo.fieldExistsInOrg(data.fieldId, organizationId))) {
      throw new BadRequestException('Unknown field');
    }

    const plantingDate = parseDate(data.plantingDate, 'plantingDate');
    if (!plantingDate) throw new BadRequestException('"plantingDate" is required');
    const harvestDate = parseDate(data.harvestDate, 'harvestDate');
    if (harvestDate && harvestDate < plantingDate) {
      throw new BadRequestException('"harvestDate" cannot precede "plantingDate"');
    }

    const cycle = await this.cropCycleRepo.create({
      organizationId,
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
      // C5: honor the caller-supplied health score instead of dropping it.
      health: data.health ?? 100,
      status: data.status || 'growing',
    });

    await this.eventService.emitCropCycleCreatedEvent(cycle);
    return cycle;
  }

  async getCropCycleById(organizationId: string, id: string) {
    const cycle = await this.cropCycleRepo.findById(id, organizationId);
    if (!cycle) throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    return cycle;
  }

  async getAllCropCycles(options: {
    organizationId: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { fieldId?: string; cropId?: string; status?: string; farmId?: string };
  }) {
    const { organizationId, ...rest } = options;
    return this.cropCycleRepo.findAll(organizationId, rest);
  }

  /**
   * C4: the calendar used to return the raw cycle page (`{ cycles, total }`)
   * while both clients render `{ data: CalendarStage[] }` with
   * `cropName`/`stageName`/`startDate`/`endDate` — so both calendars were
   * permanently empty. Derive real calendar entries from the org's crop
   * cycles: one bar per planting spanning plantingDate → harvestDate,
   * filtered to the requested month/date window (overlap semantics, so
   * ongoing plantings show up all month) and limited to a sane ceiling.
   */
  async getCalendarStages(organizationId: string, params: {
    farmId?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    this.requireOrg(organizationId);

    let windowStart: Date | null = null;
    let windowEnd: Date | null = null;
    if (params.month) {
      const match = /^(\d{4})-(\d{2})$/.exec(params.month);
      if (!match) throw new BadRequestException('"month" must be formatted YYYY-MM');
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month < 1 || month > 12) throw new BadRequestException('"month" must be between 01 and 12');
      windowStart = new Date(year, month - 1, 1);
      windowEnd = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      windowStart = parseDate(params.startDate, 'startDate');
      windowEnd = parseDate(params.endDate, 'endDate');
    }
    if (windowStart && windowEnd && windowEnd < windowStart) {
      throw new BadRequestException('"endDate" cannot precede "startDate"');
    }

    const requestedLimit = Number(params.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 500) : 500;
    const { cycles } = await this.cropCycleRepo.findAll(organizationId, {
      page: 1,
      limit,
      filter: { farmId: params.farmId },
    });

    const dayString = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const stages = cycles
      .filter((cycle: any) => {
        // Overlap: the planting starts inside the window, or is still running
        // when the window opens (open-ended harvest counts as ongoing).
        if (windowEnd && cycle.plantingDate > windowEnd) return false;
        if (windowStart && cycle.harvestDate && cycle.harvestDate < windowStart) return false;
        return true;
      })
      .map((cycle: any) => {
        const field = cycle.field as any;
        const startDate = new Date(cycle.plantingDate);
        const rawEnd = cycle.harvestDate ? new Date(cycle.harvestDate) : null;
        // Open-ended cycles (no harvest date yet) render through the end of
        // the requested window — or as a single-day bar when no window given.
        const endDate = rawEnd && (!windowEnd || rawEnd <= windowEnd) ? rawEnd : (windowEnd ?? startDate);
        return {
          id: `cycle-${cycle.id}`,
          cropCycleId: cycle.id,
          cropId: cycle.cropId,
          cropName: cycle.crop?.name ?? 'Unknown crop',
          fieldId: cycle.fieldId,
          fieldName: field?.name ?? null,
          farmId: field?.farmId ?? null,
          farmName: field?.farm?.name ?? null,
          stageName: cycle.status ?? 'growing',
          status: cycle.status ?? 'growing',
          health: cycle.health ?? 100,
          startDate: dayString(startDate),
          endDate: dayString(endDate),
        };
      })
      .sort((a: any, b: any) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));

    return { data: stages, total: stages.length };
  }

  async updateCropCycle(organizationId: string, id: string, data: Partial<{
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate: Date | string | null;
    health: number;
    status: string;
  }>) {
    const existing = await this.getCropCycleById(organizationId, id);

    if (data.cropId) {
      await this.getCropById(data.cropId, organizationId);
    }
    if (data.fieldId && !(await this.cropCycleRepo.fieldExistsInOrg(data.fieldId, organizationId))) {
      throw new BadRequestException('Unknown field');
    }

    const updateData: any = {};
    if (data.fieldId) updateData.fieldId = data.fieldId;
    if (data.cropId) updateData.cropId = data.cropId;
    if (data.status) updateData.status = data.status;
    // C5: the health score was accepted by the schema then silently dropped.
    if (data.health !== undefined) updateData.health = data.health;
    if (data.plantingDate !== undefined) {
      const plantingDate = parseDate(data.plantingDate, 'plantingDate');
      if (!plantingDate) throw new BadRequestException('"plantingDate" is required');
      updateData.plantingDate = plantingDate;
    }
    if (data.harvestDate !== undefined) {
      updateData.harvestDate = parseDate(data.harvestDate, 'harvestDate');
    }
    const effectivePlanting = updateData.plantingDate ?? existing.plantingDate;
    const effectiveHarvest = 'harvestDate' in updateData ? updateData.harvestDate : existing.harvestDate;
    if (effectiveHarvest && effectiveHarvest < effectivePlanting) {
      throw new BadRequestException('"harvestDate" cannot precede "plantingDate"');
    }

    const updatedCycle = await this.cropCycleRepo.update(id, updateData);
    await this.eventService.emitCropCycleUpdatedEvent(updatedCycle);
    return updatedCycle;
  }

  async deleteCropCycle(organizationId: string, id: string) {
    await this.getCropCycleById(organizationId, id);
    await this.cropCycleRepo.delete(id);
    // Only announce the deletion once the row is actually gone.
    await this.eventService.emitCropCycleDeletedEvent(id, organizationId);
  }
}
