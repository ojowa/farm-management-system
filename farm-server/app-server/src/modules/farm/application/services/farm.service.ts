import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { FarmRepository, FieldRepository } from '../../domain/repositories/farm.repository';
import { FarmEventService } from '../../infrastructure/messaging/farm.event.service';

type FarmWriteInput = {
  organizationId?: string;
  name?: string;
  farmType?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  size?: number | null;
  status?: string;
};

function asTrimmedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`"${field}" is required`);
  }
  return value.trim();
}

function asNumber(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  const n = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isFinite(n)) {
    throw new BadRequestException(`"${field}" must be a number`);
  }
  if (opts.min !== undefined && n < opts.min) throw new BadRequestException(`"${field}" must be >= ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new BadRequestException(`"${field}" must be <= ${opts.max}`);
  return n;
}

/** Prisma surfaces FK-restricted deletes (no cascade in the schema) as P2003. */
function isForeignKeyViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2003');
}

/**
 * Validate and normalize a farm write. Creates (`partial: false`) require
 * `name` and `farmType` and reject malformed numbers — previously bad input
 * reached Prisma and surfaced as 500s, and half of a bulk import survived.
 */
function toFarmRow(input: FarmWriteInput | any, organizationId: string, partial: boolean) {
  const row: Record<string, unknown> = { organizationId };
  if (input?.name !== undefined || !partial) row.name = asTrimmedString(input?.name, 'name');
  if (input?.farmType !== undefined || !partial) row.farmType = asTrimmedString(input?.farmType, 'farmType');
  if (input?.location !== undefined) row.location = input.location === null || input.location === '' ? null : asTrimmedString(input.location, 'location');
  if (input?.latitude !== undefined) row.latitude = input.latitude === null || input.latitude === '' ? null : asNumber(input.latitude, 'latitude', { min: -90, max: 90 });
  if (input?.longitude !== undefined) row.longitude = input.longitude === null || input.longitude === '' ? null : asNumber(input.longitude, 'longitude', { min: -180, max: 180 });
  if (input?.size !== undefined) row.size = input.size === null || input.size === '' ? 0 : asNumber(input.size, 'size', { min: 0 });
  if (input?.status !== undefined) row.status = asTrimmedString(input.status, 'status');
  return row;
}

/**
 * All organization scoping is derived from the CALLER (the controller passes
 * the JWT's organizationId). Client-supplied ids are never trusted as scope,
 * and reads of another tenant's rows surface as NotFound, not as data.
 */
@Injectable()
export class FarmApplicationService {
  constructor(@Inject('FarmRepository') private readonly farmRepo: FarmRepository, @Inject('FieldRepository') private readonly fieldRepo: FieldRepository,
    private readonly eventService: FarmEventService) {}

  /**
   * Plan entitlements for a farm write: the org's plan must allow the farm
   * type (features.farmTypes, derived from features.modules) and — for
   * creates — have maxFarms headroom. These checks existed only as
   * never-called Express middleware in features.ts, so the Nest routes
   * bypassed them entirely: any plan could create any farm type and exceed
   * its farm cap. Super admins bypass plan entitlements (both old guards
   * did); everyone else is checked.
   */
  private async assertPlanAllowsFarmWrite(organizationId: string, farmTypes: string[], additionalFarms = 0) {
    const { prisma, checkFarmTypeAllowed, checkSubscriptionLimit, getIsSuperAdmin } = await import(
      '@farm/database'
    );
    if (getIsSuperAdmin()) return;
    // The dynamically-imported client is a $extends'd instance whose type
    // doesn't structurally satisfy PrismaClient (missing `$on` in the nominal
    // shape) — cast at the boundary; runtime-wise it's the same client the
    // checks expect.
    for (const farmType of Array.from(new Set(farmTypes))) {
      const typeError = await checkFarmTypeAllowed(prisma as any, organizationId, farmType);
      if (typeError) throw new ForbiddenException(typeError);
    }
    if (additionalFarms <= 0) return;
    const limitError = await checkSubscriptionLimit(prisma as any, organizationId, 'farms');
    if (limitError) throw new ForbiddenException(limitError);
    // checkSubscriptionLimit compares only the CURRENT count against the cap;
    // a bulk import must also account for the incoming rows.
    if (additionalFarms > 1) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlanRef: { select: { maxFarms: true } } },
      });
      const maxFarms = org?.subscriptionPlanRef?.maxFarms;
      if (maxFarms) {
        const current = await prisma.farm.count({ where: { organizationId } });
        if (current + additionalFarms > maxFarms) {
          throw new ForbiddenException(`Farm limit reached (${maxFarms}) for your subscription plan`);
        }
      }
    }
  }

  async createFarm(data: FarmWriteInput & { organizationId: string }) {
    if (!data.organizationId) {
      throw new ForbiddenException('No organization associated with caller');
    }
    const row = toFarmRow(data, data.organizationId, false);
    await this.assertPlanAllowsFarmWrite(data.organizationId, [row.farmType as string], 1);
    const farm = await this.farmRepo.create({
      location: null,
      latitude: null,
      longitude: null,
      size: 0,
      status: 'active',
      ...row,
    } as any);
    await this.eventService.emitFarmCreatedEvent(farm);
    return farm;
  }

  /**
   * Bulk import: every row is validated up front (a 400 names the offending
   * row) and the creates run as ONE transaction, so a bad row can no longer
   * leave half an import behind.
   */
  async importFarms(rows: Array<FarmWriteInput | any>, organizationId: string) {
    if (!organizationId) {
      throw new ForbiddenException('No organization associated with caller');
    }
    const clean = rows.map((row, index) => {
      try {
        return { location: null, latitude: null, longitude: null, size: 0, status: 'active', ...toFarmRow(row, organizationId, false) } as any;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw new BadRequestException(`Row ${index}: ${error.message}`);
        }
        throw error;
      }
    });
    await this.assertPlanAllowsFarmWrite(
      organizationId,
      clean.map((row) => row.farmType),
      clean.length,
    );
    const farms = await this.farmRepo.createMany(clean);
    for (const farm of farms) {
      await this.eventService.emitFarmCreatedEvent(farm);
    }
    return farms;
  }

  async getFarmById(id: string, organizationId: string) {
    const farm = await this.farmRepo.findById(id, organizationId);
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async getAllFarms(organizationId: string, options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    farmType?: string;
  } = {}) {
    // A caller without an organization sees nothing — never fall through to
    // an unscoped (all-tenant) listing.
    if (!organizationId) {
      return { farms: [], total: 0 };
    }
    return this.farmRepo.findByOrganizationId(organizationId, options);
  }

  async updateFarm(id: string, organizationId: string, data: FarmWriteInput) {
    const existing = await this.getFarmById(id, organizationId);
    const row = toFarmRow(data, organizationId, true);
    // Re-check only when the farmType CHANGES: renaming a farm that predates
    // a plan downgrade must keep working, but you can't migrate INTO a type
    // the plan doesn't include.
    if (row.farmType !== undefined && row.farmType !== existing.farmType) {
      await this.assertPlanAllowsFarmWrite(organizationId, [row.farmType as string]);
    }
    const updatedFarm = await this.farmRepo.update(id, organizationId, row as any);
    await this.eventService.emitFarmUpdatedEvent(updatedFarm);
    return updatedFarm;
  }

  async deleteFarm(id: string, organizationId: string) {
    const farm = await this.getFarmById(id, organizationId);
    try {
      await this.farmRepo.delete(id, organizationId);
    } catch (error) {
      // Fields, inventory, expenses, sales, livestock and workers reference
      // the farm with required FKs and no cascade — surface that as an
      // actionable conflict instead of a Prisma 500.
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Farm has dependent records (fields, inventory, expenses, sales, livestock or workers). Remove or reassign them first.',
        );
      }
      throw error;
    }
    // Only announce the deletion once the row is actually gone.
    await this.eventService.emitFarmDeletedEvent(farm.id, farm.organizationId);
  }

  async createField(data: { farmId: string; name: string; size: number }, organizationId: string) {
    // Existence check doubles as ownership check: scoped to the caller's org.
    await this.getFarmById(data.farmId, organizationId);
    const field = await this.fieldRepo.create({
      farmId: data.farmId,
      name: asTrimmedString(data?.name, 'name'),
      size: asNumber(data?.size, 'size', { min: 0 }),
    });
    return field;
  }

  async getFieldById(id: string, organizationId: string) {
    const field = await this.fieldRepo.findById(id, organizationId);
    if (!field) throw new NotFoundException('Field not found');
    return field;
  }

  async getAllFields(farmId: string | undefined, organizationId: string) {
    // Prisma strips `undefined` filters, so a missing farmId would otherwise
    // return every tenant's fields.
    if (!farmId) throw new BadRequestException('farmId query parameter is required');
    await this.getFarmById(farmId, organizationId);
    return this.fieldRepo.findByFarmId(farmId, organizationId);
  }

  async updateField(id: string, organizationId: string, data: Partial<{ name: string; size: number }>) {
    await this.getFieldById(id, organizationId);
    const clean: Record<string, unknown> = {};
    if (data?.name !== undefined) clean.name = asTrimmedString(data.name, 'name');
    if (data?.size !== undefined) clean.size = asNumber(data.size, 'size', { min: 0 });
    return this.fieldRepo.update(id, clean as any);
  }

  async deleteField(id: string, organizationId: string) {
    await this.getFieldById(id, organizationId);
    try {
      await this.fieldRepo.delete(id);
    } catch (error) {
      // CropCycle references Field with a required FK and no cascade.
      if (isForeignKeyViolation(error)) {
        throw new ConflictException('Field has crop cycles. Remove them first.');
      }
      throw error;
    }
  }
}
