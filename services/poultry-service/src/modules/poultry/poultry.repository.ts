import { prisma } from '@farm/database';

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

  async getAllPoultryHouses() {
    return prisma.poultryHouse.findMany({
      include: { pens: true },
    });
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

  async getAllPens() {
    return prisma.pen.findMany({
      include: { poultryHouse: true },
    });
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

  async getAllBreeds() {
    return prisma.breed.findMany();
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

  async getAllFlocks() {
    return prisma.flock.findMany({
      include: {
        farm: true,
        pen: true,
        breed: true,
      },
    });
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

  async getAllFeedingRecords() {
    return prisma.feedingRecord.findMany({
      include: { flock: true },
    });
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

  async getAllVaccinationRecords() {
    return prisma.vaccinationRecord.findMany({
      include: { flock: true },
    });
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

  async getAllMortalityRecords() {
    return prisma.mortalityRecord.findMany({
      include: { flock: true },
    });
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
