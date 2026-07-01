import { scopedPrisma as prisma } from '@farm/database';

export class PoultryRepository {
  // --- PoultryHouse CRUD ---
  async createPoultryHouse(data: { farmId: string; name: string; capacity: number }) {
    return prisma.poultryHouse.create({
      data,
    });
  }

  async getPoultryHouseById(id: string) {
    return prisma.poultryHouse.findUnique({
      where: { id },
      include: { pens: true },
    });
  }

  async getAllPoultryHouses(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' as const };

    const [data, total] = await Promise.all([
      prisma.poultryHouse.findMany({ where, include: { pens: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.poultryHouse.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updatePoultryHouse(id: string, data: { farmId?: string; name?: string; capacity?: number }) {
    return prisma.poultryHouse.update({
      where: { id },
      data,
    });
  }

  async deletePoultryHouse(id: string) {
    return prisma.poultryHouse.delete({
      where: { id },
    });
  }

  // --- Pen CRUD ---
  async createPen(data: { poultryHouseId: string; name: string; capacity: number }) {
    return prisma.pen.create({
      data,
    });
  }

  async getPenById(id: string) {
    return prisma.pen.findUnique({
      where: { id },
      include: { poultryHouse: true },
    });
  }

  async getAllPens(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.poultryHouseId) where.poultryHouseId = filter.poultryHouseId;
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' as const };

    const [data, total] = await Promise.all([
      prisma.pen.findMany({ where, include: { poultryHouse: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.pen.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updatePen(id: string, data: { poultryHouseId?: string; name?: string; capacity?: number }) {
    return prisma.pen.update({
      where: { id },
      data,
    });
  }

  async deletePen(id: string) {
    return prisma.pen.delete({
      where: { id },
    });
  }

  // --- Breed CRUD ---
  async createBreed(data: { name: string; birdType: string }) {
    return prisma.breed.create({
      data,
    });
  }

  async getBreedById(id: string) {
    return prisma.breed.findUnique({
      where: { id },
    });
  }

  async getAllBreeds(filter: any = {}, sortBy: string = 'name', sortOrder: 'asc' | 'desc' = 'asc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' as const };
    if (filter.birdType) where.birdType = filter.birdType;

    const [data, total] = await Promise.all([
      prisma.breed.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.breed.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateBreed(id: string, data: { name?: string; birdType?: string }) {
    return prisma.breed.update({
      where: { id },
      data,
    });
  }

  async deleteBreed(id: string) {
    return prisma.breed.delete({
      where: { id },
    });
  }

  // --- Flock CRUD ---
  async createFlock(data: {
    organizationId: string;
    farmId: string;
    penId: string;
    breedId: string;
    batchCode: string;
    birdCount: number;
    currentCount: number;
    arrivalDate: Date;
    currentAgeDays: number;
    status: string;
  }) {
    return prisma.flock.create({
      data,
      include: {
        farm: true,
        pen: true,
        breed: true,
      },
    });
  }

  async getFlockById(id: string) {
    return prisma.flock.findUnique({
      where: { id },
      include: {
        farm: true,
        pen: true,
        breed: true,
        feedingRecords: true,
        vaccinationRecords: true,
        mortalityRecords: true,
      },
    });
  }

  async getAllFlocks(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.penId) where.penId = filter.penId;
    if (filter.breedId) where.breedId = filter.breedId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { batchCode: { contains: filter.search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.flock.findMany({ where, include: { farm: true, pen: true, breed: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.flock.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateFlock(
    id: string,
    data: {
      organizationId?: string;
      farmId?: string;
      penId?: string;
      breedId?: string;
      batchCode?: string;
      birdCount?: number;
      currentCount?: number;
      arrivalDate?: Date;
      currentAgeDays?: number;
      status?: string;
    }
  ) {
    return prisma.flock.update({
      where: { id },
      data,
      include: {
        farm: true,
        pen: true,
        breed: true,
      },
    });
  }

  async deleteFlock(id: string) {
    return prisma.flock.delete({
      where: { id },
    });
  }

  // --- FeedingRecord CRUD ---
  async createFeedingRecord(data: { flockId: string; feedType: string; quantityKg: number; date: Date }) {
    return prisma.feedingRecord.create({
      data,
      include: { flock: true },
    });
  }

  async getFeedingRecordById(id: string) {
    return prisma.feedingRecord.findUnique({
      where: { id },
      include: { flock: true },
    });
  }

  async getAllFeedingRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.feedType) where.feedType = { contains: filter.feedType, mode: 'insensitive' as const };

    const [data, total] = await Promise.all([
      prisma.feedingRecord.findMany({ where, include: { flock: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.feedingRecord.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateFeedingRecord(
    id: string,
    data: { flockId?: string; feedType?: string; quantityKg?: number; date?: Date }
  ) {
    return prisma.feedingRecord.update({
      where: { id },
      data,
      include: { flock: true },
    });
  }

  async deleteFeedingRecord(id: string) {
    return prisma.feedingRecord.delete({
      where: { id },
    });
  }

  // --- VaccinationRecord CRUD ---
  async createVaccinationRecord(data: { flockId: string; vaccine: string; dosage?: string | null; date: Date }) {
    return prisma.vaccinationRecord.create({
      data,
      include: { flock: true },
    });
  }

  async getVaccinationRecordById(id: string) {
    return prisma.vaccinationRecord.findUnique({
      where: { id },
      include: { flock: true },
    });
  }

  async getAllVaccinationRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.flockId) where.flockId = filter.flockId;
    if (filter.vaccine) where.vaccine = { contains: filter.vaccine, mode: 'insensitive' as const };

    const [data, total] = await Promise.all([
      prisma.vaccinationRecord.findMany({ where, include: { flock: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.vaccinationRecord.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateVaccinationRecord(
    id: string,
    data: { flockId?: string; vaccine?: string; dosage?: string | null; date?: Date }
  ) {
    return prisma.vaccinationRecord.update({
      where: { id },
      data,
      include: { flock: true },
    });
  }

  async deleteVaccinationRecord(id: string) {
    return prisma.vaccinationRecord.delete({
      where: { id },
    });
  }

  // --- MortalityRecord CRUD ---
  async createMortalityRecord(data: { flockId: string; count: number; cause?: string | null; date: Date }) {
    return prisma.mortalityRecord.create({
      data,
      include: { flock: true },
    });
  }

  async getMortalityRecordById(id: string) {
    return prisma.mortalityRecord.findUnique({
      where: { id },
      include: { flock: true },
    });
  }

  async getAllMortalityRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.flockId) where.flockId = filter.flockId;

    const [data, total] = await Promise.all([
      prisma.mortalityRecord.findMany({ where, include: { flock: true }, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.mortalityRecord.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateMortalityRecord(
    id: string,
    data: { flockId?: string; count?: number; cause?: string | null; date?: Date }
  ) {
    return prisma.mortalityRecord.update({
      where: { id },
      data,
      include: { flock: true },
    });
  }

  async deleteMortalityRecord(id: string) {
    return prisma.mortalityRecord.delete({
      where: { id },
    });
  }
}
