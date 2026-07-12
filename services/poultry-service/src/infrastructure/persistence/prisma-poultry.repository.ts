import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import {
  PoultryHouseRepository,
  PenRepository,
  BreedRepository,
  FlockRepository,
  FeedingRecordRepository,
  VaccinationRecordRepository,
  MortalityRecordRepository,
  MedicationRepository,
  PoultryHouseFilter,
  PenFilter,
  BreedFilter,
  FlockFilter,
  FeedingRecordFilter,
  VaccinationRecordFilter,
  MortalityRecordFilter,
  MedicationFilter,
  PaginationOptions,
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
export class PrismaPoultryHouseRepository implements PoultryHouseRepository {
  async findById(id: string): Promise<PoultryHouse | null> {
    return prisma.poultryHouse.findUnique({ where: { id } }) as Promise<PoultryHouse | null>;
  }

  async findAll(filter: PoultryHouseFilter, options: PaginationOptions): Promise<PaginatedResult<PoultryHouse>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
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

  async create(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse> {
    return prisma.poultryHouse.create({ data }) as Promise<PoultryHouse>;
  }

  async update(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse> {
    return prisma.poultryHouse.update({ where: { id }, data }) as Promise<PoultryHouse>;
  }

  async delete(id: string): Promise<void> {
    await prisma.poultryHouse.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaPenRepository implements PenRepository {
  async findById(id: string): Promise<Pen | null> {
    return prisma.pen.findUnique({ where: { id } }) as Promise<Pen | null>;
  }

  async findAll(filter: PenFilter, options: PaginationOptions): Promise<PaginatedResult<Pen>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
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

  async create(data: Omit<Pen, 'id'>): Promise<Pen> {
    return prisma.pen.create({ data }) as Promise<Pen>;
  }

  async update(id: string, data: Partial<Pen>): Promise<Pen> {
    return prisma.pen.update({ where: { id }, data }) as Promise<Pen>;
  }

  async delete(id: string): Promise<void> {
    await prisma.pen.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaBreedRepository implements BreedRepository {
  async findById(id: string): Promise<Breed | null> {
    return prisma.breed.findUnique({ where: { id } }) as Promise<Breed | null>;
  }

  async findAll(filter: BreedFilter, options: PaginationOptions): Promise<PaginatedResult<Breed>> {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = options;
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

  async create(data: Omit<Breed, 'id'>): Promise<Breed> {
    return prisma.breed.create({ data }) as Promise<Breed>;
  }

  async update(id: string, data: Partial<Breed>): Promise<Breed> {
    return prisma.breed.update({ where: { id }, data }) as Promise<Breed>;
  }

  async delete(id: string): Promise<void> {
    await prisma.breed.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaFlockRepository implements FlockRepository {
  async findById(id: string): Promise<Flock | null> {
    return prisma.flock.findUnique({ where: { id } }) as Promise<Flock | null>;
  }

  async findAll(filter: FlockFilter, options: PaginationOptions): Promise<PaginatedResult<Flock>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
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

  async create(data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flock> {
    return prisma.flock.create({ data }) as Promise<Flock>;
  }

  async update(id: string, data: Partial<Flock>): Promise<Flock> {
    return prisma.flock.update({ where: { id }, data }) as Promise<Flock>;
  }

  async delete(id: string): Promise<void> {
    await prisma.flock.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaFeedingRecordRepository implements FeedingRecordRepository {
  async findById(id: string): Promise<FeedingRecord | null> {
    return prisma.feedingRecord.findUnique({ where: { id } }) as Promise<FeedingRecord | null>;
  }

  async findAll(filter: FeedingRecordFilter, options: PaginationOptions): Promise<PaginatedResult<FeedingRecord>> {
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = options;
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

  async create(data: Omit<FeedingRecord, 'id' | 'createdAt'>): Promise<FeedingRecord> {
    return prisma.feedingRecord.create({ data }) as Promise<FeedingRecord>;
  }

  async update(id: string, data: Partial<FeedingRecord>): Promise<FeedingRecord> {
    return prisma.feedingRecord.update({ where: { id }, data }) as Promise<FeedingRecord>;
  }

  async delete(id: string): Promise<void> {
    await prisma.feedingRecord.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaVaccinationRecordRepository implements VaccinationRecordRepository {
  async findById(id: string): Promise<VaccinationRecord | null> {
    return prisma.vaccinationRecord.findUnique({ where: { id } }) as Promise<VaccinationRecord | null>;
  }

  async findAll(filter: VaccinationRecordFilter, options: PaginationOptions): Promise<PaginatedResult<VaccinationRecord>> {
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = options;
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

  async create(data: Omit<VaccinationRecord, 'id' | 'createdAt'>): Promise<VaccinationRecord> {
    return prisma.vaccinationRecord.create({ data }) as Promise<VaccinationRecord>;
  }

  async update(id: string, data: Partial<VaccinationRecord>): Promise<VaccinationRecord> {
    return prisma.vaccinationRecord.update({ where: { id }, data }) as Promise<VaccinationRecord>;
  }

  async delete(id: string): Promise<void> {
    await prisma.vaccinationRecord.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaMortalityRecordRepository implements MortalityRecordRepository {
  async findById(id: string): Promise<MortalityRecord | null> {
    return prisma.mortalityRecord.findUnique({ where: { id } }) as Promise<MortalityRecord | null>;
  }

  async findAll(filter: MortalityRecordFilter, options: PaginationOptions): Promise<PaginatedResult<MortalityRecord>> {
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.flockId) where.flockId = filter.flockId;

    const [data, total] = await Promise.all([
      prisma.mortalityRecord.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.mortalityRecord.count({ where }),
    ]);
    return { data: data as MortalityRecord[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.create({ data }) as Promise<MortalityRecord>;
  }

  async update(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord> {
    return prisma.mortalityRecord.update({ where: { id }, data }) as Promise<MortalityRecord>;
  }

  async delete(id: string): Promise<void> {
    await prisma.mortalityRecord.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaMedicationRepository implements MedicationRepository {
  async findById(id: string): Promise<Medication | null> {
    return prisma.medication.findUnique({ where: { id } }) as Promise<Medication | null>;
  }

  async findAll(filter: MedicationFilter, options: PaginationOptions): Promise<PaginatedResult<Medication>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
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

  async create(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    return prisma.medication.create({ data }) as Promise<Medication>;
  }

  async update(id: string, data: Partial<Medication>): Promise<Medication> {
    return prisma.medication.update({ where: { id }, data }) as Promise<Medication>;
  }

  async delete(id: string): Promise<void> {
    await prisma.medication.delete({ where: { id } });
  }
}
