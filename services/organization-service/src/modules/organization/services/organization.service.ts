import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization, CreateOrganizationRequest } from '@farm/types';

@Injectable()
export class OrganizationService {
  private organizations: Organization[] = [];

  async create(createDto: CreateOrganizationRequest): Promise<Organization> {
    const newOrganization: Organization = {
      id: Math.random().toString(36).substring(7),
      name: createDto.name,
      slug: createDto.slug,
      subscriptionPlan: (createDto.subscriptionPlan as any) || 'FREE',
      subscriptionStatus: 'TRIAL',
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
        measurementUnit: 'METRIC',
        dateFormat: 'YYYY-MM-DD',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.push(newOrganization);
    return newOrganization;
  }

  async findOne(id: string): Promise<Organization> {
    const org = this.organizations.find(o => o.id === id);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return org;
  }

  async update(id: string, updateDto: any): Promise<Organization> {
    const index = this.organizations.findIndex(o => o.id === id);
    if (index === -1) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    const updatedOrg = {
      ...this.organizations[index],
      ...updateDto,
      updatedAt: new Date(),
    };
    this.organizations[index] = updatedOrg;
    return updatedOrg;
  }

  async findAll(): Promise<Organization[]> {
    return this.organizations;
  }
}
