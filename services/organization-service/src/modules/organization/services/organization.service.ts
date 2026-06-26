import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Organization, CreateOrganizationRequest } from '@farm/types';
import { OrganizationRepository } from '../repositories/organization.repository';

@Injectable()
export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async create(createDto: CreateOrganizationRequest): Promise<Organization> {
    const existingBySlug = await this.repository.findBySlug(createDto.slug);
    if (existingBySlug) {
      throw new ConflictException(`Organization with slug ${createDto.slug} already exists`);
    }

    const existingByEmail = await this.repository.findBySlug(createDto.adminEmail);
    if (existingByEmail) {
      throw new ConflictException(`Organization with email ${createDto.adminEmail} already exists`);
    }

    return this.repository.create(createDto);
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.repository.findById(id);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return org;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repository.findBySlug(slug);
  }

  async update(id: string, updateDto: Partial<Organization>): Promise<Organization> {
    await this.findOne(id);
    return this.repository.update(id, updateDto);
  }

  async findAll(): Promise<Organization[]> {
    return this.repository.findAll();
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }
}