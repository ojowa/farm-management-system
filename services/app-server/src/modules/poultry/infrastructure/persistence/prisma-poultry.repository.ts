import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
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
} from '../../domain/entities/poultry.entity';

@Injectable()
export class PrismaPoultryRepository implements PoultryAggregateRepository {
  // ── PoultryHouse ──
  async findPoultryHouseById(id: string): Promise<PoultryHouse | null> {
    return prisma.poultryHouse.findUnique({ where: { id } }) as Promise<PoultryHouse | null>;
  }

  async findAllPoultryHouses(filter: PoultryHouseFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultryHouse>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.poultryHouse.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
  async findPenById(id: string): Promise<Pen | null> {
    return prisma.pen.findUnique({ where: { id } }) as Promise<Pen | null>;
  }

  async findAllPens(filter: PenFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Pen>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.poultryHouseId) where.poultryHouseId = filter.poultryHouseId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.pen.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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

  // ── Breed ──
  async findBreedById(id: string): Promise<Breed | null> {
    return prisma.breed.findUnique({ where: { id } }) as Promise<Breed | null>;
  }

  async findAllBreeds(filter: BreedFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Breed>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
    if (filter.birdType) where.birdType = filter.birdType;

    const [data, total] = await Promise.all([
      prisma.breed.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
  async findFlockById(id: string): Promise<Flock | null> {
    return prisma.flock.findUnique({ where: { id } }) as Promise<Flock | null>;
  }

  async findAllFlocks(filter: FlockFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Flock>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.penId) where.penId = filter.penId;
    if (filter.breedId) where.breedId = filter.breedId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { batchCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.flock.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
  async findFeedingRecordById(id: string): Promise<FeedingRecord | null> {
    return prisma.feedingRecord.findUnique({ where: { id } }) as Promise<FeedingRecord | null>;
  }

  async findAllFeedingRecords(filter: FeedingRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<FeedingRecord>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.feedType) where.feedType = { contains: filter.feedType, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.feedingRecord.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
  async findVaccinationRecordById(id: string): Promise<VaccinationRecord | null> {
    return prisma.vaccinationRecord.findUnique({ where: { id } }) as Promise<VaccinationRecord | null>;
  }

  async findAllVaccinationRecords(filter: VaccinationRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<VaccinationRecord>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.vaccine) where.vaccine = { contains: filter.vaccine, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.vaccinationRecord.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
  async findMortalityRecordById(id: string): Promise<MortalityRecord | null> {
    return prisma.mortalityRecord.findUnique({ where: { id } }) as Promise<MortalityRecord | null>;
  }

  async findAllMortalityRecords(filter: MortalityRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<MortalityRecord>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.flockId) where.flockId = filter.flockId;

    const [data, total] = await Promise.all([
      prisma.mortalityRecord.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.mortalityRecord.count({ where }),
    ]);
    return { data: data as MortalityRecord[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async createMortalityRecord(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.create({ data }) as Promise<MortalityRecord>;
  }

  async updateMortalityRecord(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.update({ where: { id }, data }) as Promise<MortalityRecord>;
  }

  async deleteMortalityRecord(id: string): Promise<void> {
    await prisma.mortalityRecord.delete({ where: { id } });
  }

  // ── Medication ──
  async findMedicationById(id: string): Promise<Medication | null> {
    return prisma.medication.findUnique({ where: { id } }) as Promise<Medication | null>;
  }

  async findAllMedications(filter: MedicationFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Medication>> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
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
      prisma.medication.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
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
}
