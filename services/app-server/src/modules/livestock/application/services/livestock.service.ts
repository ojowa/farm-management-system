import { Inject,  Injectable, NotFoundException } from '@nestjs/common';
import {
  LivestockRepository,
  HealthRecordRepository,
  BreedingRecordRepository,
  WeightRecordRepository,
  VaccinationScheduleRepository,
  LivestockFilter,
} from '../../domain/repositories/livestock.repository';
import { LivestockEventService } from '../../infrastructure/messaging/livestock.event.service';
import { Livestock, HealthRecord, BreedingRecord, WeightRecord, VaccinationSchedule } from '../../domain/entities/livestock.entity';

@Injectable()
export class LivestockApplicationService {
  constructor(@Inject('LivestockRepository') private readonly livestockRepo: LivestockRepository, @Inject('HealthRecordRepository') private readonly healthRepo: HealthRecordRepository, @Inject('BreedingRecordRepository') private readonly breedingRepo: BreedingRecordRepository, @Inject('WeightRecordRepository') private readonly weightRepo: WeightRecordRepository, @Inject('VaccinationScheduleRepository') private readonly vaccinationRepo: VaccinationScheduleRepository, 
    private readonly eventService: LivestockEventService, 
  ) {}

  async createLivestock(data: {
    farmId: string;
    species: string;
    breed?: string | null;
    gender: string;
    birthDate: Date | string;
    status: string;
  }): Promise<Livestock> {
    const farm = await this.livestockRepo.getFarmById(data.farmId);
    if (!farm) throw new NotFoundException(`Farm with ID ${data.farmId} not found`);

    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;

    const livestock = await this.livestockRepo.create({
      farmId: data.farmId,
      species: data.species,
      breed: data.breed ?? null,
      gender: data.gender,
      birthDate,
      status: data.status,
    });
    await this.eventService.emitLivestockCreatedEvent(livestock);
    return livestock;
  }

  async getLivestockById(id: string): Promise<Livestock> {
    const livestock = await this.livestockRepo.findById(id);
    if (!livestock) throw new NotFoundException(`Livestock with ID ${id} not found`);
    return livestock;
  }

  async getAllLivestock(
    filter: LivestockFilter = {}, 
    sortBy: string = 'createdAt', 
    sortOrder: 'asc' | 'desc' = 'desc', 
    page: number = 1, 
    limit: number = 20, 
  ) {
    return this.livestockRepo.findAll(filter, { sortBy, sortOrder, page, limit });
  }

  async updateLivestock(id: string,  data: Partial<{
    farmId: string;
    species: string;
    breed: string | null;
    gender: string;
    birthDate: Date | string;
    status: string;
  }>): Promise<Livestock> {
    await this.getLivestockById(id);

    if (data.farmId) {
      const farm = await this.livestockRepo.getFarmById(data.farmId);
      if (!farm) throw new NotFoundException(`Farm with ID ${data.farmId} not found`);
    }

    const updateData: any = { ...data };
    if (data.birthDate) {
      updateData.birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;
    }

    const livestock = await this.livestockRepo.update(id, updateData);
    await this.eventService.emitLivestockUpdatedEvent(livestock);
    return livestock;
  }

  async deleteLivestock(id: string) {
    await this.getLivestockById(id);
    await this.livestockRepo.delete(id);
    await this.eventService.emitLivestockDeletedEvent(id);
    return { deleted: true };
  }

  async getHealthHistory(livestockId: string,  organizationId: string): Promise<HealthRecord[]> {
    return this.healthRepo.findByLivestockId(livestockId, organizationId);
  }

  async addHealthRecord(data: {
    organizationId: string;
    livestockId: string;
    type: string;
    date: Date | string;
    description: string;
    veterinarian?: string;
    medications?: string;
    cost?: number;
    nextCheckupDate?: Date | string;
    createdById?: string;
    createdByName?: string;
  }): Promise<HealthRecord> {
    return this.healthRepo.create({
      ...data,
      date: typeof data.date === 'string' ? new Date(data.date) : data.date,
      veterinarian: data.veterinarian || null,
      medications: data.medications || null,
      cost: data.cost || null,
      nextCheckupDate: data.nextCheckupDate
        ? typeof data.nextCheckupDate === 'string'
          ? new Date(data.nextCheckupDate)
          : data.nextCheckupDate
        : null,
      createdById: data.createdById || null,
      createdByName: data.createdByName || null,
    });
  }

  async getVaccinationSchedule(livestockId: string, organizationId: string): Promise<VaccinationSchedule[]> {
    return this.vaccinationRepo.findByLivestockId(livestockId, organizationId);
  }

  async scheduleVaccination(data: {
    organizationId: string;
    livestockId: string;
    vaccineName: string;
    scheduledDate: Date | string;
    notes?: string;
    createdById?: string;
    createdByName?: string;
  }): Promise<VaccinationSchedule> {
    return this.vaccinationRepo.create({
      ...data,
      scheduledDate: typeof data.scheduledDate === 'string' ? new Date(data.scheduledDate) : data.scheduledDate,
      notes: data.notes?.trim() || null,
      createdById: data.createdById || null,
      createdByName: data.createdByName || null,
      administeredDate: null,
      status: 'SCHEDULED',
    });
  }

  async administerVaccination(id: string): Promise<VaccinationSchedule> {
    return this.vaccinationRepo.update(id, {
      status: 'ADMINISTERD',
      administeredDate: new Date(),
    });
  }

  async getOverdueVaccinations(organizationId: string): Promise<VaccinationSchedule[]> {
    return this.vaccinationRepo.findOverdue(organizationId);
  }

  async getBreedingRecords(organizationId: string, status?: string): Promise<BreedingRecord[]> {
    return this.breedingRepo.findAll(organizationId, { status });
  }

  async createBreedingRecord(data: {
    organizationId: string;
    sireId: string;
    sireName?: string;
    damId: string;
    damName?: string;
    breedingDate: Date | string;
    expectedDueDate?: Date | string;
    notes?: string;
    createdById?: string;
    createdByName?: string;
  }): Promise<BreedingRecord> {
    return this.breedingRepo.create({
      ...data,
      sireName: data.sireName || null,
      damName: data.damName || null,
      breedingDate: typeof data.breedingDate === 'string' ? new Date(data.breedingDate) : data.breedingDate,
      expectedDueDate: data.expectedDueDate
        ? typeof data.expectedDueDate === 'string'
          ? new Date(data.expectedDueDate)
          : data.expectedDueDate
        : null,
      actualBirthDate: null,
      offspringCount: null,
      status: 'BRED',
      notes: data.notes?.trim() || null,
      createdById: data.createdById || null,
      createdByName: data.createdByName || null,
    });
  }

  async updateBreedingRecord(id: string, data: Partial<{
    status: string;
    actualBirthDate: Date | string | null;
    offspringCount: number;
    notes: string;
  }>): Promise<BreedingRecord> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.actualBirthDate !== undefined) {
      updateData.actualBirthDate = data.actualBirthDate
        ? typeof data.actualBirthDate === 'string'
          ? new Date(data.actualBirthDate)
          : data.actualBirthDate
        : null;
    }
    if (data.offspringCount !== undefined) updateData.offspringCount = data.offspringCount;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    return this.breedingRepo.update(id, updateData);
  }

  async getUpcomingBreedingRecords(organizationId: string): Promise<BreedingRecord[]> {
    return this.breedingRepo.findUpcoming(organizationId);
  }

  async getLivestockWeightHistory(livestockId: string, organizationId: string): Promise<WeightRecord[]> {
    return this.weightRepo.findByLivestockId(livestockId, organizationId);
  }

  async recordLivestockWeight(data: {
    organizationId: string;
    livestockId: string;
    weight: number;
    unit?: string;
    recordedDate: Date | string;
    notes?: string;
    createdById?: string;
  }): Promise<WeightRecord> {
    return this.weightRepo.create({
      ...data,
      livestockId: data.livestockId,
      flockId: null,
      weight: Number(data.weight),
      unit: data.unit || 'kg',
      recordedDate: typeof data.recordedDate === 'string' ? new Date(data.recordedDate) : data.recordedDate,
      notes: data.notes?.trim() || null,
      createdById: data.createdById || null,
    });
  }

  async getFlockWeightHistory(flockId: string, organizationId: string): Promise<WeightRecord[]> {
    return this.weightRepo.findByFlockId(flockId, organizationId);
  }

  async recordFlockWeight(data: {
    organizationId: string;
    flockId: string;
    weight: number;
    unit?: string;
    recordedDate: Date | string;
    notes?: string;
    createdById?: string;
  }): Promise<WeightRecord> {
    return this.weightRepo.create({
      ...data,
      livestockId: null,
      flockId: data.flockId,
      weight: Number(data.weight),
      unit: data.unit || 'kg',
      recordedDate: typeof data.recordedDate === 'string' ? new Date(data.recordedDate) : data.recordedDate,
      notes: data.notes?.trim() || null,
      createdById: data.createdById || null,
    });
  }
}
