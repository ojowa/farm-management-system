import { Inject,  Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  private requireOrg(organizationId: string): void {
    if (!organizationId) throw new ForbiddenException('No organization context');
  }

  async createLivestock(organizationId: string, data: {
    farmId: string;
    species: string;
    breed?: string | null;
    gender: string;
    birthDate: Date | string;
    status: string;
  }): Promise<Livestock> {
    this.requireOrg(organizationId);
    const farm = await this.livestockRepo.getFarmById(data.farmId, organizationId);
    if (!farm) throw new NotFoundException(`Farm with ID ${data.farmId} not found`);

    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;

    const livestock = await this.livestockRepo.create({
      // Tenancy always comes from the JWT, never from the request body.
      organizationId,
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

  async getLivestockById(organizationId: string, id: string): Promise<Livestock> {
    const livestock = await this.livestockRepo.findById(id, organizationId);
    if (!livestock) throw new NotFoundException(`Livestock with ID ${id} not found`);
    return livestock;
  }

  async getAllLivestock(
    organizationId: string,
    filter: Omit<LivestockFilter, 'organizationId'> = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20,
  ) {
    return this.livestockRepo.findAll({ ...filter, organizationId }, { sortBy, sortOrder, page, limit });
  }

  async updateLivestock(organizationId: string, id: string,  data: Partial<{
    farmId: string;
    species: string;
    breed: string | null;
    gender: string;
    birthDate: Date | string;
    status: string;
  }>): Promise<Livestock> {
    await this.getLivestockById(organizationId, id);

    if (data.farmId) {
      const farm = await this.livestockRepo.getFarmById(data.farmId, organizationId);
      if (!farm) throw new NotFoundException(`Farm with ID ${data.farmId} not found`);
    }

    const updateData: any = { ...data };
    // An animal can never change tenancy.
    delete updateData.organizationId;
    if (data.birthDate) {
      updateData.birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;
    }

    const livestock = await this.livestockRepo.update(id, updateData);
    await this.eventService.emitLivestockUpdatedEvent(livestock);
    return livestock;
  }

  async deleteLivestock(organizationId: string, id: string) {
    await this.getLivestockById(organizationId, id);
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
    // Only attach health records to animals inside the caller's org.
    await this.getLivestockById(data.organizationId, data.livestockId);
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
    await this.getLivestockById(data.organizationId, data.livestockId);
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

  async administerVaccination(organizationId: string, id: string): Promise<VaccinationSchedule> {
    const schedule = await this.vaccinationRepo.findById(id, organizationId);
    if (!schedule) throw new NotFoundException(`Vaccination schedule with ID ${id} not found`);
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
    // Both parents must belong to the caller's organization.
    await this.getLivestockById(data.organizationId, data.sireId);
    await this.getLivestockById(data.organizationId, data.damId);
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

  async updateBreedingRecord(organizationId: string, id: string, data: Partial<{
    status: string;
    actualBirthDate: Date | string | null;
    offspringCount: number;
    notes: string;
  }>): Promise<BreedingRecord> {
    const existing = await this.breedingRepo.findById(id, organizationId);
    if (!existing) throw new NotFoundException(`Breeding record with ID ${id} not found`);
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
    await this.getLivestockById(data.organizationId, data.livestockId);
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
    // Only attach flock weights to flocks inside the caller's org — the FK
    // alone would let any tenant record data against a foreign flock.
    const flock = await this.livestockRepo.getFlockById(data.flockId, data.organizationId);
    if (!flock) throw new NotFoundException(`Flock with ID ${data.flockId} not found`);
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
