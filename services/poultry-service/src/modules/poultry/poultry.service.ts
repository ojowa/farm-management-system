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
import { emitPoultryEvent } from '../../../../../shared-services/events/event-emitter';

export class PoultryService {
  private repository = new PoultryRepository();

  // --- PoultryHouse Service Methods ---
  async createPoultryHouse(data: CreatePoultryHouseRequest) {
    const house = await this.repository.createPoultryHouse(data);
    await emitPoultryEvent('created', house);
    return house;
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
    const house = await this.repository.updatePoultryHouse(id, data);
    await emitPoultryEvent('updated', house);
    return house;
  }

  async deletePoultryHouse(id: string) {
    await this.getPoultryHouseById(id);
    await this.repository.deletePoultryHouse(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Pen Service Methods ---
  async createPen(data: CreatePenRequest) {
    // Validate PoultryHouse exists
    await this.getPoultryHouseById(data.poultryHouseId);
    const pen = await this.repository.createPen(data);
    await emitPoultryEvent('created', pen);
    return pen;
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
    const pen = await this.repository.updatePen(id, data);
    await emitPoultryEvent('updated', pen);
    return pen;
  }

  async deletePen(id: string) {
    await this.getPenById(id);
    await this.repository.deletePen(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Breed Service Methods ---
  async createBreed(data: CreateBreedRequest) {
    const breed = await this.repository.createBreed(data);
    await emitPoultryEvent('created', breed);
    return breed;
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
    const breed = await this.repository.updateBreed(id, data);
    await emitPoultryEvent('updated', breed);
    return breed;
  }

  async deleteBreed(id: string) {
    await this.getBreedById(id);
    await this.repository.deleteBreed(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Flock Service Methods ---
  async createFlock(data: CreateFlockRequest) {
    // Validate relations
    await this.getPenById(data.penId);
    await this.getBreedById(data.breedId);

    const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;

    const flock = await this.repository.createFlock({
      ...data,
      arrivalDate,
    });
    await emitPoultryEvent('created', flock);
    return flock;
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

    const flock = await this.repository.updateFlock(id, {
      ...data,
      arrivalDate,
    });
    await emitPoultryEvent('updated', flock);
    return flock;
  }

  async deleteFlock(id: string) {
    await this.getFlockById(id);
    await this.repository.deleteFlock(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- FeedingRecord Service Methods ---
  async createFeedingRecord(data: CreateFeedingRecordRequest) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repository.createFeedingRecord({
      ...data,
      date,
    });
    await emitPoultryEvent('created', record);
    return record;
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
    const record = await this.repository.updateFeedingRecord(id, {
      ...data,
      date,
    });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteFeedingRecord(id: string) {
    await this.getFeedingRecordById(id);
    await this.repository.deleteFeedingRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- VaccinationRecord Service Methods ---
  async createVaccinationRecord(data: CreateVaccinationRecordRequest) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repository.createVaccinationRecord({
      ...data,
      date,
    });
    await emitPoultryEvent('created', record);
    return record;
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
    const record = await this.repository.updateVaccinationRecord(id, {
      ...data,
      date,
    });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteVaccinationRecord(id: string) {
    await this.getVaccinationRecordById(id);
    await this.repository.deleteVaccinationRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
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

    await emitPoultryEvent('created', record);
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

    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteMortalityRecord(id: string) {
    const record = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(record.flockId);

    // Restore the flock count by the deleted record's count
    const updatedCount = flock.currentCount + record.count;
    await this.repository.updateFlock(flock.id, { currentCount: updatedCount });

    await this.repository.deleteMortalityRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }
}
