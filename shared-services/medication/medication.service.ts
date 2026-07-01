import { Injectable, NotFoundException } from '@nestjs/common';
import { Medication, CreateMedicationRequest, UpdateMedicationRequest } from '@farm/types';
import { MedicationRepository } from './medication.repository';

@Injectable()
export class MedicationService {
  constructor(private readonly repository: MedicationRepository) {}

  async create(createDto: CreateMedicationRequest): Promise<Medication> {
    return this.repository.create(createDto);
  }

  async findById(id: string): Promise<Medication> {
    const medication = await this.repository.findById(id);
    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }
    return medication;
  }

  async findAll(
    options?: { 
      flockId?: string; 
      page?: number; 
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ data: Medication[]; total: number; page: number; totalPages: number }> {
    const { flockId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options || {};
    
    const filter: any = {};
    if (flockId) {
      filter.flockId = flockId;
    }
    
    return this.repository.findAll(filter, sortBy, sortOrder, page, limit);
  }

  async update(id: string, updateDto: UpdateMedicationRequest): Promise<Medication> {
    await this.findById(id);
    return this.repository.update(id, updateDto);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }

  async getMedicationWithFlockDetails(id: string): Promise<any> {
    const medication = await this.findById(id);
    
    // If medication has a flockId, include flock details
    if (medication.flockId) {
      try {
        const flockResponse = await fetch(`http://localhost:4003/livestocks/${medication.flockId}`);
        const flock = await flockResponse.json();
        return { ...medication, flockDetails: flock };
      } catch (error) {
        return { ...medication, flockDetails: null };
      }
    }
    
    return medication;
  }

  async createMedicationForFlock(flockId: string, medicationData: CreateMedicationRequest): Promise<Medication> {
    // Validate that flock exists
    try {
      const flockResponse = await fetch(`http://localhost:4003/livestocks/${flockId}`);
      if (!flockResponse.ok) {
        throw new NotFoundException(`Flock with ID ${flockId} not found`);
      }
    } catch (error) {
      throw new NotFoundException(`Failed to validate flock: ${error.message}`);
    }
    
    const medicationDataWithFlock = { ...medicationData, flockId };
    const medication = await this.create(medicationDataWithFlock);
    
    // Emit real-time event
    const { getSocketGateway } = require('../shared/socket-gateway');
    const gateway = getSocketGateway();
    gateway.emitRealtimeEvent({
      entity: 'medication',
      action: 'created',
      data: medication,
    });
    
    return medication;
  }
}