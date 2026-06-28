import { PoultryRepository } from './poultry.repository';
import {
  CreatePoultryHouseRequest,
  UpdatePoultryHouseRequest,
  CreatePenRequest,
  UpdatePenRequest,
  CreateBreedRequest,
  UpdateBreedRequest,
  CreateFlockRequest,
  UpdateFlockRequest,
  CreateFeedingRecordRequest,
  UpdateFeedingRecordRequest,
  CreateVaccinationRecordRequest,
  UpdateVaccinationRecordRequest,
  CreateMortalityRecordRequest,
  UpdateMortalityRecordRequest
} from '@farm/types';

export class PoultryService {
  private repository = new PoultryRepository();

  // --- PoultryHouse Service Methods ---
  async createPoultryHouse(data: CreatePoultryHouseRequest) {
    return this.repository.createPoultryHouse(data);
  }

  async getPoultryHouseById(id: string) {
    const house = await this.repository.getPoultryHouseById(id);
    if (!house) {
      throw new Error(`PoultryHouse with ID ${id} not found`);
    }
    return house;
  }

  async getAllPoultryHouses(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllPoultryHouses(filter, sortBy, sortOrder, page, limit);
  }

  async updatePoultryHouse(id: string, data: UpdatePoultryHouseRequest) {
    await this.getPoultryHouseById(id);
    return this.repository.updatePoultryHouse(id, data);
  }

  async deletePoultryHouse(id: string) {
    await this.getPoultryHouseById(id);
    return this.repository.deletePoultryHouse(id);
  }

  // --- Pen Service Methods ---
  async createPen(data: CreatePenRequest) {
    // Validate PoultryHouse exists
    await this.getPoultryHouseById(data.poultryHouseId);
    return this.repository.createPen(data);
  }

  async getPenById(id: string) {
    const pen = await this.repository.getPenById(id);
    if (!pen) {
      throw new Error(`Pen with ID ${id} not found`);
    }
    return pen;
  }

  async getAllPens(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllPens(filter, sortBy, sortOrder, page, limit);
  }

  async updatePen(id: string, data: UpdatePenRequest) {
    await this.getPenById(id);
    if (data.poultryHouseId) {
      await this.getPoultryHouseById(data.poultryHouseId);
    }
    return this.repository.updatePen(id, data);
  }

  async deletePen(id: string) {
    await this.getPenById(id);
    return this.repository.deletePen(id);
  }

  // --- Breed Service Methods ---
  async createBreed(data: CreateBreedRequest) {
    return this.repository.createBreed(data);
  }

  async getBreedById(id: string) {
    const breed = await this.repository.getBreedById(id);
    if (!breed) {
      throw new Error(`Breed with ID ${id} not found`);
    }
    return breed;
  }

  async getAllBreeds(filter: any = {}, sortBy: string = 'name', sortOrder: 'asc' | 'desc' = 'asc', page: number = 1, limit: number = 20) {
    return this.repository.getAllBreeds(filter, sortBy, sortOrder, page, limit);
  }

  async updateBreed(id: string, data: UpdateBreedRequest) {
    await this.getBreedById(id);
    return this.repository.updateBreed(id, data);
  }

  async deleteBreed(id: string) {
    await this.getBreedById(id);
    return this.repository.deleteBreed(id);
  }

  // --- Flock Service Methods ---
  async createFlock(data: CreateFlockRequest) {
    // Validate relations
    await this.getPenById(data.penId);
    await this.getBreedById(data.breedId);

    const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;

    return this.repository.createFlock({
      ...data,
      arrivalDate,
    });
  }

  async getFlockById(id: string) {
    const flock = await this.repository.getFlockById(id);
    if (!flock) {
      throw new Error(`Flock with ID ${id} not found`);
    }
    return flock;
  }

  async getAllFlocks(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllFlocks(filter, sortBy, sortOrder, page, limit);
  }

  async updateFlock(id: string, data: UpdateFlockRequest) {
    await this.getFlockById(id);
    if (data.penId) {
      await this.getPenById(data.penId);
    }
    if (data.breedId) {
      await this.getBreedById(data.breedId);
    }

    const arrivalDate = data.arrivalDate ? (typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate) : undefined;

    return this.repository.updateFlock(id, {
      ...data,
      arrivalDate,
    });
  }

  async deleteFlock(id: string) {
    await this.getFlockById(id);
    return this.repository.deleteFlock(id);
  }

  // --- FeedingRecord Service Methods ---
  async createFeedingRecord(data: CreateFeedingRecordRequest) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    return this.repository.createFeedingRecord({
      ...data,
      date,
    });
  }

  async getFeedingRecordById(id: string) {
    const record = await this.repository.getFeedingRecordById(id);
    if (!record) {
      throw new Error(`Feeding record with ID ${id} not found`);
    }
    return record;
  }

  async getAllFeedingRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllFeedingRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateFeedingRecord(id: string, data: UpdateFeedingRecordRequest) {
    await this.getFeedingRecordById(id);
    if (data.flockId) {
      await this.getFlockById(data.flockId);
    }
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    return this.repository.updateFeedingRecord(id, {
      ...data,
      date,
    });
  }

  async deleteFeedingRecord(id: string) {
    await this.getFeedingRecordById(id);
    return this.repository.deleteFeedingRecord(id);
  }

  // --- VaccinationRecord Service Methods ---
  async createVaccinationRecord(data: CreateVaccinationRecordRequest) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    return this.repository.createVaccinationRecord({
      ...data,
      date,
    });
  }

  async getVaccinationRecordById(id: string) {
    const record = await this.repository.getVaccinationRecordById(id);
    if (!record) {
      throw new Error(`Vaccination record with ID ${id} not found`);
    }
    return record;
  }

  async getAllVaccinationRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllVaccinationRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateVaccinationRecord(id: string, data: UpdateVaccinationRecordRequest) {
    await this.getVaccinationRecordById(id);
    if (data.flockId) {
      await this.getFlockById(data.flockId);
    }
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    return this.repository.updateVaccinationRecord(id, {
      ...data,
      date,
    });
  }

  async deleteVaccinationRecord(id: string) {
    await this.getVaccinationRecordById(id);
    return this.repository.deleteVaccinationRecord(id);
  }

  // --- MortalityRecord Service Methods ---
  async createMortalityRecord(data: CreateMortalityRecordRequest) {
    const flock = await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;

    // Check if mortality count exceeds current bird count
    if (data.count > flock.currentCount) {
      throw new Error(`Mortality count (${data.count}) cannot exceed current flock bird count (${flock.currentCount})`);
    }

    const record = await this.repository.createMortalityRecord({
      ...data,
      date,
    });

    // Automatically update flock current count
    const updatedCount = flock.currentCount - data.count;
    await this.repository.updateFlock(flock.id, { currentCount: updatedCount });

    return record;
  }

  async getMortalityRecordById(id: string) {
    const record = await this.repository.getMortalityRecordById(id);
    if (!record) {
      throw new Error(`Mortality record with ID ${id} not found`);
    }
    return record;
  }

  async getAllMortalityRecords(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllMortalityRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateMortalityRecord(id: string, data: UpdateMortalityRecordRequest) {
    const originalRecord = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(originalRecord.flockId);

    let countDiff = 0;
    if (data.count !== undefined) {
      countDiff = data.count - originalRecord.count;
      if (countDiff > flock.currentCount) {
        throw new Error(`Updated mortality count exceeds available flock count by ${countDiff - flock.currentCount}`);
      }
    }

    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repository.updateMortalityRecord(id, {
      ...data,
      date,
    });

    if (countDiff !== 0) {
      const updatedCount = flock.currentCount - countDiff;
      await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
    }

    return record;
  }

  async deleteMortalityRecord(id: string) {
    const record = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(record.flockId);

    // Restore the flock count by the deleted record's count
    const updatedCount = flock.currentCount + record.count;
    await this.repository.updateFlock(flock.id, { currentCount: updatedCount });

    return this.repository.deleteMortalityRecord(id);
  }
}
