import { Inject,  Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { CreateOrganizationRequest } from '../../../../kernel/types';

@Injectable()
export class OrganizationApplicationService {
  constructor(@Inject('OrganizationRepository') private readonly orgRepo: OrganizationRepository) {}

  async create(createDto: CreateOrganizationRequest) {
    const existingBySlug = await this.orgRepo.findBySlug(createDto.slug);
    if (existingBySlug) {
      throw new BadRequestException(`Organization with slug ${createDto.slug} already exists`);
    }

    const existingByEmail = await this.orgRepo.findBySlug(createDto.adminEmail);
    if (existingByEmail) {
      throw new BadRequestException(`Organization with email ${createDto.adminEmail} already exists`);
    }

    let planName = createDto.subscriptionPlan;
    if (planName) {
      const plan = await this.orgRepo.findSubscriptionPlanByName(planName);
      if (!plan) {
        throw new BadRequestException(`Subscription plan '${planName}' does not exist`);
      }
    } else {
      const defaultPlan = await this.orgRepo.findDefaultSubscriptionPlan();
      planName = defaultPlan?.name || 'FREE';
    }

    return this.orgRepo.create({
      name: createDto.name,
      slug: createDto.slug,
      email: createDto.adminEmail,
      subscriptionPlan: planName,
      subscriptionStatus: 'TRIAL',
      settings: { currency: 'USD', timezone: 'UTC', language: 'en', measurementUnit: 'METRIC', dateFormat: 'YYYY-MM-DD' },
    });
  }

  async findOne(id: string, organizationId?: string) {
    // Tenancy: this module is strictly self-service — the :id in the path must
    // be the caller's own organization, so a foreign id reads as not-found.
    if (!organizationId || id !== organizationId) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    const org = await this.orgRepo.findById(id);
    if (!org) throw new NotFoundException(`Organization with ID ${id} not found`);
    return org;
  }

  async findBySlug(slug: string, organizationId?: string) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    const org = await this.orgRepo.findBySlug(slug);
    if (!org || org.id !== organizationId) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: string, organizationId: string, updateDto: Partial<{ name: string; slug: string; email: string; subscriptionPlan: string; subscriptionStatus: string; settings: Record<string, any> }>) {
    await this.findOne(id, organizationId);

    if (updateDto.subscriptionPlan) {
      const plan = await this.orgRepo.findSubscriptionPlanByName(updateDto.subscriptionPlan);
      if (!plan) {
        throw new BadRequestException(`Subscription plan '${updateDto.subscriptionPlan}' does not exist`);
      }
    }

    return this.orgRepo.update(id, updateDto);
  }

  async findAll(organizationId?: string) {
    // Never enumerate other tenants — a caller only ever sees their own row.
    if (!organizationId) return [];
    const org = await this.orgRepo.findById(organizationId);
    return org ? [org] : [];
  }

  async getSubscriptionPlans() {
    return this.orgRepo.findActiveSubscriptionPlans();
  }

  async delete(id: string, organizationId?: string) {
    await this.findOne(id, organizationId);
    return this.orgRepo.delete(id);
  }
}
