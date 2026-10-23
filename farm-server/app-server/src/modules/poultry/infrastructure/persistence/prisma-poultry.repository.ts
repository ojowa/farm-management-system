import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { safeOrderBy } from '../../../../common/sort';

// These three models have no `createdAt` column, so they cannot be sorted by
// the default `sortBy=createdAt` the controller passes down.
const POULTRY_HOUSE_SORTABLE = ['id', 'farmId', 'name', 'capacity'] as const;
const PEN_SORTABLE = ['id', 'poultryHouseId', 'name', 'capacity'] as const;
const BREED_SORTABLE = ['id', 'name', 'birdType'] as const;
// S3: every remaining list passed `{ [sortBy]: sortOrder }` straight into
// orderBy, so `?sortBy=__proto__` (or any typo) crashed Prisma with a 500.
const FLOCK_SORTABLE = ['id', 'farmId', 'penId', 'breedId', 'batchCode', 'birdCount', 'currentCount', 'arrivalDate', 'currentAgeDays', 'status', 'createdAt', 'updatedAt'] as const;
const FEEDING_SORTABLE = ['id', 'flockId', 'feedType', 'quantityKg', 'date', 'createdAt'] as const;
const VACCINATION_SORTABLE = ['id', 'flockId', 'vaccine', 'date', 'createdAt'] as const;
const MORTALITY_SORTABLE = ['id', 'flockId', 'count', 'date', 'createdAt'] as const;
const MEDICATION_SORTABLE = ['id', 'flockId', 'name', 'dosage', 'frequency', 'startDate', 'endDate', 'status', 'createdAt', 'updatedAt'] as const;
const EGG_SORTABLE = ['id', 'flockId', 'date', 'totalEggs', 'goodEggs', 'brokenEggs', 'createdAt'] as const;
const SALE_SORTABLE = ['id', 'farmId', 'flockId', 'date', 'birdType', 'quantity', 'weight', 'pricePerBird', 'totalAmount', 'createdAt'] as const;

/**
 * S2: `?startDate=not-a-date` used to become `Invalid Date` and reach Prisma
 * as an unserializable value (500). Reject invalid filters instead of
 * silently dropping them.
 */
function optionalFilterDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Date filter must be a valid date');
  }
  return date;
}

function liveFlockScope(organizationId: string) {
  return {
    organizationId,
    deletedAt: null,
    farm: { deletedAt: null },
    pen: { poultryHouse: { deletedAt: null } },
  };
}
import {
  PoultryAggregateRepository,
  PoultryHouseFilter,
  PenFilter,
  BreedFilter,
  FlockFilter,
  FeedingRecordFilter,
  VaccinationRecordFilter,
  MortalityRecordFilter,
  MedicationFilter,
  EggProductionFilter,
  PoultrySaleFilter,
  PaginatedResult,
} from '../../domain/repositories/poultry.repository';
import {
  PoultryHouse,
  Pen,
  Breed,
  Flock,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
  EggProduction,
  PoultrySale,
} from '../../domain/entities/poultry.entity';

/**
 * Org scoping:
 * - House: through its farm (`farm.organizationId`)
 * - Pen: through its house → farm
 * - Flock / EggProduction / PoultrySale: direct `organizationId` column
 * - Feeding/Vaccination/Mortality/Medication records: through their flock
 * Reads use findFirst with the scope baked into the WHERE so a foreign record
 * reads as "not found" (404) instead of leaking its existence.
 * Writes go through the service, which performs the same scoped lookup first.
 */
@Injectable()
export class PrismaPoultryRepository implements PoultryAggregateRepository {
  async farmExistsInOrg(farmId: string, organizationId: string): Promise<boolean> {
    if (!farmId || !organizationId) return false;
    const farm = await prisma.farm.findFirst({ where: { id: farmId, organizationId }, select: { id: true } });
    return !!farm;
  }

  // ── PoultryHouse ──
  async findPoultryHouseById(id: string, organizationId: string): Promise<PoultryHouse | null> {
    return prisma.poultryHouse.findFirst({
      where: { id, farm: { organizationId, deletedAt: null } },
    }) as Promise<PoultryHouse | null>;
  }

  async findAllPoultryHouses(filter: PoultryHouseFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultryHouse>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { farm: { organizationId: filter.organizationId, deletedAt: null } };
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.poultryHouse.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, POULTRY_HOUSE_SORTABLE, 'name'), skip, take: limit }),
      prisma.poultryHouse.count({ where }),
    ]);
    return { data: data as PoultryHouse[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createPoultryHouse(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse> {
    return prisma.poultryHouse.create({ data }) as Promise<PoultryHouse>;
  }

  async updatePoultryHouse(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse> {
    return prisma.poultryHouse.update({ where: { id }, data }) as Promise<PoultryHouse>;
  }

  async deletePoultryHouse(id: string): Promise<void> {
    await prisma.poultryHouse.delete({ where: { id } });
  }

  // ── Pen ──
  async findPenById(id: string, organizationId: string): Promise<Pen | null> {
    return prisma.pen.findFirst({
      where: { id, poultryHouse: { deletedAt: null, farm: { organizationId, deletedAt: null } } },
    }) as Promise<Pen | null>;
  }

  async findAllPens(filter: PenFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Pen>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      poultryHouse: { deletedAt: null, farm: { organizationId: filter.organizationId, deletedAt: null } },
    };
    if (filter.poultryHouseId) where.poultryHouseId = filter.poultryHouseId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.pen.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, PEN_SORTABLE, 'name'), skip, take: limit }),
      prisma.pen.count({ where }),
    ]);
    return { data: data as Pen[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createPen(data: Omit<Pen, 'id'>): Promise<Pen> {
    return prisma.pen.create({ data }) as Promise<Pen>;
  }

  async updatePen(id: string, data: Partial<Pen>): Promise<Pen> {
    return prisma.pen.update({ where: { id }, data }) as Promise<Pen>;
  }

  async deletePen(id: string): Promise<void> {
    await prisma.pen.delete({ where: { id } });
  }

  // ── Breed (shared catalog — no organization column) ──
  async findBreedById(id: string): Promise<Breed | null> {
    return prisma.breed.findUnique({ where: { id } }) as Promise<Breed | null>;
  }

  async findAllBreeds(filter: BreedFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Breed>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
    if (filter.birdType) where.birdType = filter.birdType;

    const [data, total] = await Promise.all([
      prisma.breed.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, BREED_SORTABLE, 'name'), skip, take: limit }),
      prisma.breed.count({ where }),
    ]);
    return { data: data as Breed[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createBreed(data: Omit<Breed, 'id'>): Promise<Breed> {
    return prisma.breed.create({ data }) as Promise<Breed>;
  }

  async updateBreed(id: string, data: Partial<Breed>): Promise<Breed> {
    return prisma.breed.update({ where: { id }, data }) as Promise<Breed>;
  }

  async deleteBreed(id: string): Promise<void> {
    await prisma.breed.delete({ where: { id } });
  }

  // ── Flock ──
  async findFlockById(id: string, organizationId: string): Promise<Flock | null> {
    return prisma.flock.findFirst({
      where: { id, ...liveFlockScope(organizationId) },
    }) as Promise<Flock | null>;
  }

  /**
   * P6: batch codes are unique per organization (the DB index is
   * `organizationId + batchCode`). This pre-check lets the service return a
   * clear 409 instead of letting a raw P2002 escape.
   */
  async findFlockByBatchCode(organizationId: string, batchCode: string, excludeId?: string): Promise<Flock | null> {
    return prisma.flock.findFirst({
      where: {
        organizationId,
        batchCode,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }) as Promise<Flock | null>;
  }

  async findAllFlocks(filter: FlockFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Flock>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      ...liveFlockScope(filter.organizationId),
    };
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.poultryHouseId) where.pen = { poultryHouseId: filter.poultryHouseId };
    if (filter.penId) where.penId = filter.penId;
    if (filter.breedId) where.breedId = filter.breedId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { batchCode: { contains: filter.search, mode: 'insensitive' } },
        { breed: { is: { name: { contains: filter.search, mode: 'insensitive' } } } },
        { farm: { is: { name: { contains: filter.search, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.flock.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, FLOCK_SORTABLE, 'createdAt'), skip, take: limit }),
      prisma.flock.count({ where }),
    ]);
    return { data: data as Flock[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createFlock(data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flock> {
    return prisma.flock.create({ data }) as Promise<Flock>;
  }

  async updateFlock(id: string, data: Partial<Flock>): Promise<Flock> {
    return prisma.flock.update({ where: { id }, data }) as Promise<Flock>;
  }

  async deleteFlock(id: string): Promise<void> {
    await prisma.flock.delete({ where: { id } });
  }

  // ── FeedingRecord ──
  async findFeedingRecordById(id: string, organizationId: string): Promise<FeedingRecord | null> {
    return prisma.feedingRecord.findFirst({ where: { id, flock: liveFlockScope(organizationId) } }) as Promise<FeedingRecord | null>;
  }

  async findAllFeedingRecords(filter: FeedingRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<FeedingRecord>> {
    const skip = (page - 1) * limit;
    const flockFilter: Record<string, unknown> = liveFlockScope(filter.organizationId);
    if (filter.poultryHouseId) {
      flockFilter.pen = { poultryHouseId: filter.poultryHouseId };
    }
    const where: Record<string, unknown> = { flock: flockFilter };
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.feedType) where.feedType = { contains: filter.feedType, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.feedingRecord.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, FEEDING_SORTABLE, 'date'), skip, take: limit }),
      prisma.feedingRecord.count({ where }),
    ]);
    return { data: data as FeedingRecord[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createFeedingRecord(data: Omit<FeedingRecord, 'id' | 'createdAt'>): Promise<FeedingRecord> {
    return prisma.feedingRecord.create({ data }) as Promise<FeedingRecord>;
  }

  async updateFeedingRecord(id: string, data: Partial<FeedingRecord>): Promise<FeedingRecord> {
    return prisma.feedingRecord.update({ where: { id }, data }) as Promise<FeedingRecord>;
  }

  async deleteFeedingRecord(id: string): Promise<void> {
    await prisma.feedingRecord.delete({ where: { id } });
  }

  // ── VaccinationRecord ──
  async findVaccinationRecordById(id: string, organizationId: string): Promise<VaccinationRecord | null> {
    return prisma.vaccinationRecord.findFirst({ where: { id, flock: liveFlockScope(organizationId) } }) as Promise<VaccinationRecord | null>;
  }

  async findAllVaccinationRecords(filter: VaccinationRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<VaccinationRecord>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { flock: liveFlockScope(filter.organizationId) };
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.vaccine) where.vaccine = { contains: filter.vaccine, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.vaccinationRecord.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, VACCINATION_SORTABLE, 'date'), skip, take: limit }),
      prisma.vaccinationRecord.count({ where }),
    ]);
    return { data: data as VaccinationRecord[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createVaccinationRecord(data: Omit<VaccinationRecord, 'id' | 'createdAt'>): Promise<VaccinationRecord> {
    return prisma.vaccinationRecord.create({ data }) as Promise<VaccinationRecord>;
  }

  async updateVaccinationRecord(id: string, data: Partial<VaccinationRecord>): Promise<VaccinationRecord> {
    return prisma.vaccinationRecord.update({ where: { id }, data }) as Promise<VaccinationRecord>;
  }

  async deleteVaccinationRecord(id: string): Promise<void> {
    await prisma.vaccinationRecord.delete({ where: { id } });
  }

  // ── MortalityRecord ──
  async findMortalityRecordById(id: string, organizationId: string): Promise<MortalityRecord | null> {
    return prisma.mortalityRecord.findFirst({ where: { id, flock: liveFlockScope(organizationId) } }) as Promise<MortalityRecord | null>;
  }

  async findAllMortalityRecords(filter: MortalityRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<MortalityRecord>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { flock: liveFlockScope(filter.organizationId) };
    if (filter.flockId) where.flockId = filter.flockId;

    const [data, total] = await Promise.all([
      prisma.mortalityRecord.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, MORTALITY_SORTABLE, 'date'), skip, take: limit }),
      prisma.mortalityRecord.count({ where }),
    ]);
    return { data: data as MortalityRecord[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createMortalityRecord(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.create({ data }) as Promise<MortalityRecord>;
  }

  /**
   * P3: the mortality row and the flock count decrement must succeed or fail
   * together — a crash between the two writes used to leave the flock count
   * permanently wrong (birds recorded dead, still counted alive).
   */
  async createMortalityRecordWithFlockAdjust(
    data: Omit<MortalityRecord, 'id' | 'createdAt'>,
    count: number,
  ): Promise<MortalityRecord> {
    return prisma.$transaction(async (tx: any) => {
      const flock = await tx.flock.findFirst({ where: { id: data.flockId } });
      if (!flock) throw new NotFoundException(`Flock with ID ${data.flockId} not found`);
      if (count > flock.currentCount) {
        throw new BadRequestException(
          `Mortality count (${count}) cannot exceed current flock bird count (${flock.currentCount})`,
        );
      }
      const record = await tx.mortalityRecord.create({ data });
      await tx.flock.update({ where: { id: flock.id }, data: { currentCount: flock.currentCount - count } });
      return record;
    }) as Promise<MortalityRecord>;
  }

  /**
   * P3: editing a mortality can MOVE it between flocks (`flockId` change).
   * The old code only subtracted the count delta from the ORIGINAL flock, so
   * moving a record from flock A to flock B double-decremented A and never
   * touched B. Apply the full diff to BOTH sides in one transaction.
   */
  async updateMortalityRecordWithFlockAdjust(
    id: string,
    data: Partial<MortalityRecord> & { date?: Date | string },
    diff: { countDelta: number; flockId?: string; from?: { flockId: string; count: number }; to?: { flockId: string; count: number } },
  ): Promise<MortalityRecord> {
    return prisma.$transaction(async (tx: any) => {
      if (diff.from) {
        // Credit the old flock back for the birds this record used to own.
        await tx.flock.update({
          where: { id: diff.from.flockId },
          data: { currentCount: { increment: diff.from.count } },
        });
      }
      if (diff.to) {
        const target = await tx.flock.findFirst({ where: { id: diff.to.flockId } });
        if (!target) throw new NotFoundException(`Flock with ID ${diff.to.flockId} not found`);
        if (diff.to.count > target.currentCount) {
          throw new BadRequestException(
            `Mortality count (${diff.to.count}) cannot exceed target flock bird count (${target.currentCount})`,
          );
        }
        await tx.flock.update({
          where: { id: diff.to.flockId },
          data: { currentCount: target.currentCount - diff.to.count },
        });
      } else if (!diff.from && diff.flockId && diff.countDelta !== 0) {
        // Stationary record whose COUNT changed: apply the net delta to the
        // flock the record stays with (guarding against going negative).
        const stay = await tx.flock.findFirst({ where: { id: diff.flockId } });
        if (!stay) throw new NotFoundException(`Flock with ID ${diff.flockId} not found`);
        const remaining = stay.currentCount - diff.countDelta;
        if (remaining < 0) {
          throw new BadRequestException(
            `Updated mortality count would leave the flock at ${remaining} birds — it only has ${stay.currentCount}`,
          );
        }
        await tx.flock.update({ where: { id: diff.flockId }, data: { currentCount: remaining } });
      }
      return tx.mortalityRecord.update({ where: { id }, data });
    }) as Promise<MortalityRecord>;
  }

  /** P3 delete counterpart: the birds rejoin the flock, atomically. */
  async deleteMortalityRecordWithFlockRestore(id: string, record: { flockId: string; count: number }): Promise<void> {
    await prisma.$transaction(async (tx: any) => {
      await tx.flock.update({
        where: { id: record.flockId },
        data: { currentCount: { increment: record.count } },
      });
      await tx.mortalityRecord.delete({ where: { id } });
    });
  }

  async updateMortalityRecord(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.update({ where: { id }, data }) as Promise<MortalityRecord>;
  }

  async deleteMortalityRecord(id: string): Promise<void> {
    await prisma.mortalityRecord.delete({ where: { id } });
  }

  // ── Medication ──
  async findMedicationById(id: string, organizationId: string): Promise<Medication | null> {
    return prisma.medication.findFirst({ where: { id, flock: liveFlockScope(organizationId) } }) as Promise<Medication | null>;
  }

  async findAllMedications(filter: MedicationFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Medication>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { flock: liveFlockScope(filter.organizationId) };
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { dosage: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.medication.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, MEDICATION_SORTABLE, 'createdAt'), skip, take: limit }),
      prisma.medication.count({ where }),
    ]);
    return { data: data as Medication[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    return prisma.medication.create({ data }) as Promise<Medication>;
  }

  async updateMedication(id: string, data: Partial<Medication>): Promise<Medication> {
    return prisma.medication.update({ where: { id }, data }) as Promise<Medication>;
  }

  async deleteMedication(id: string): Promise<void> {
    await prisma.medication.delete({ where: { id } });
  }

  // ── EggProduction ──
  async findEggProductionById(id: string, organizationId: string): Promise<EggProduction | null> {
    return prisma.eggProduction.findFirst({
      where: { id, organizationId, flock: liveFlockScope(organizationId) },
    }) as Promise<EggProduction | null>;
  }

  async findAllEggProductions(filter: EggProductionFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<EggProduction>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      organizationId: filter.organizationId,
      flock: liveFlockScope(filter.organizationId),
    };
    if (filter.flockId) where.flockId = filter.flockId;
    const startDate = optionalFilterDate(filter.startDate);
    const endDate = optionalFilterDate(filter.endDate);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as any).gte = startDate;
      if (endDate) (where.date as any).lte = endDate;
    }

    const [data, total] = await Promise.all([
      prisma.eggProduction.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, EGG_SORTABLE, 'date'), skip, take: limit }),
      prisma.eggProduction.count({ where }),
    ]);
    return { data: data as EggProduction[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createEggProduction(data: Omit<EggProduction, 'id' | 'createdAt' | 'updatedAt'>): Promise<EggProduction> {
    return prisma.eggProduction.create({ data }) as Promise<EggProduction>;
  }

  async updateEggProduction(id: string, data: Partial<EggProduction>): Promise<EggProduction> {
    return prisma.eggProduction.update({ where: { id }, data }) as Promise<EggProduction>;
  }

  async deleteEggProduction(id: string): Promise<void> {
    await prisma.eggProduction.delete({ where: { id } });
  }

  // ── PoultrySale ──
  async findPoultrySaleById(id: string, organizationId: string): Promise<PoultrySale | null> {
    return prisma.poultrySale.findFirst({
      where: {
        id,
        organizationId,
        OR: [
          { flockId: null },
          { flock: { is: liveFlockScope(organizationId) } },
        ],
      },
    }) as Promise<PoultrySale | null>;
  }

  async findAllPoultrySales(filter: PoultrySaleFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultrySale>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      organizationId: filter.organizationId,
      OR: [
        { flockId: null },
        { flock: { is: liveFlockScope(filter.organizationId) } },
      ],
    };
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.flockId) where.flockId = filter.flockId;
    const startDate = optionalFilterDate(filter.startDate);
    const endDate = optionalFilterDate(filter.endDate);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as any).gte = startDate;
      if (endDate) (where.date as any).lte = endDate;
    }

    const [data, total] = await Promise.all([
      prisma.poultrySale.findMany({ where, orderBy: safeOrderBy(sortBy, sortOrder, SALE_SORTABLE, 'date'), skip, take: limit }),
      prisma.poultrySale.count({ where }),
    ]);
    return { data: data as PoultrySale[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createPoultrySale(data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt'>): Promise<PoultrySale> {
    return prisma.poultrySale.create({ data }) as Promise<PoultrySale>;
  }

  /**
   * P2: a sale must decrement the flock's live count (and mark it SOLD once
   * the birds run out) AT THE SAME TIME the sale row is written. Doing the
   * two writes separately let a failure between them leave the flock count
   * wrong forever; a negative quantity used to silently ADD birds.
   */
  async createPoultrySaleWithFlockAdjust(
    data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt'>,
    flockId: string,
    quantity: number,
  ): Promise<PoultrySale> {
    return prisma.$transaction(async (tx: any) => {
      // Read inside the transaction so concurrent sales can't both pass the
      // same stale availability check.
      const flock = await tx.flock.findFirst({ where: { id: flockId, organizationId: data.organizationId } });
      if (!flock) throw new NotFoundException(`Flock with ID ${flockId} not found`);
      if (quantity > flock.currentCount) {
        throw new BadRequestException(
          `Sale quantity (${quantity}) exceeds the flock's current bird count (${flock.currentCount})`,
        );
      }
      const remaining = flock.currentCount - quantity;
      const sale = await tx.poultrySale.create({ data });
      await tx.flock.update({
        where: { id: flockId },
        data: { currentCount: remaining, ...(remaining === 0 ? { status: 'SOLD' } : {}) },
      });
      return sale;
    }) as Promise<PoultrySale>;
  }

  /**
   * P2 update counterpart: re-credits the OLD flock and re-debits the NEW
   * one when a sale is edited, inside one transaction.
   */
  async updatePoultrySaleWithFlockAdjust(
    id: string,
    data: Partial<PoultrySale>,
    adjustments: { from?: { flockId: string; quantity: number }; to?: { flockId: string; quantity: number } },
  ): Promise<PoultrySale> {
    return prisma.$transaction(async (tx: any) => {
      if (adjustments.from) {
        await this.applyFlockSaleDelta(tx, adjustments.from.flockId, adjustments.from.quantity, data.organizationId);
      }
      if (adjustments.to) {
        await this.applyFlockSaleDelta(tx, adjustments.to.flockId, -adjustments.to.quantity, data.organizationId);
      }
      return tx.poultrySale.update({ where: { id }, data });
    }) as Promise<PoultrySale>;
  }

  /** P2 delete counterpart: birds that came back (sale removed) rejoin the flock. */
  async deletePoultrySaleWithFlockRestore(id: string, sale: { flockId: string | null; quantity: number; organizationId: string }): Promise<void> {
    // Capture so TypeScript narrows the type inside the transaction closure.
    const { flockId, quantity, organizationId } = sale;
    if (!flockId) {
      await prisma.poultrySale.delete({ where: { id } });
      return;
    }
    await prisma.$transaction(async (tx: any) => {
      await this.applyFlockSaleDelta(tx, flockId, quantity, organizationId);
      await tx.poultrySale.delete({ where: { id } });
    });
  }

  /** Positive delta adds birds back; negative delta sells them off. */
  private async applyFlockSaleDelta(tx: any, flockId: string, delta: number, organizationId?: string): Promise<void> {
    const flock = await tx.flock.findFirst({ where: { id: flockId, ...(organizationId ? { organizationId } : {}) } });
    if (!flock) throw new NotFoundException(`Flock with ID ${flockId} not found`);
    const remaining = flock.currentCount + delta;
    if (remaining < 0) {
      throw new BadRequestException(
        `Adjustment would leave the flock at ${remaining} birds — the flock only has ${flock.currentCount} right now`,
      );
    }
    await tx.flock.update({
      where: { id: flockId },
      data: {
        currentCount: remaining,
        // A flock sold back to life is ACTIVE again; one drawn to zero is SOLD.
        ...(flock.status === 'SOLD' && remaining > 0 ? { status: 'ACTIVE' } : {}),
        ...(remaining === 0 && flock.status === 'ACTIVE' ? { status: 'SOLD' } : {}),
      },
    });
  }

  async updatePoultrySale(id: string, data: Partial<PoultrySale>): Promise<PoultrySale> {
    return prisma.poultrySale.update({ where: { id }, data }) as Promise<PoultrySale>;
  }

  async deletePoultrySale(id: string): Promise<void> {
    await prisma.poultrySale.delete({ where: { id } });
  }
}
