import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { OrganizationRepository, SubscriptionPlanInfo } from '../../domain/repositories/organization.repository';
import { Organization } from '../../domain/entities/organization.entity';

const toJson = (value: unknown): any => value as any;

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } }) as unknown as Promise<Organization | null>;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { slug } }) as unknown as Promise<Organization | null>;
  }

  async findAll(): Promise<Organization[]> {
    return prisma.organization.findMany({ orderBy: { createdAt: 'desc' } }) as unknown as Promise<Organization[]>;
  }

  async create(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
        settings: toJson(data.settings),
      },
    }) as unknown as Promise<Organization>;
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const { settings, ...rest } = data;
    return prisma.organization.update({
      where: { id },
      data: {
        ...rest,
        ...(settings ? { settings: toJson(settings) } : {}),
        updatedAt: new Date(),
      },
    }) as unknown as Promise<Organization>;
  }

  async delete(id: string): Promise<void> {
    await prisma.organization.delete({ where: { id } });
  }

  async findDefaultSubscriptionPlan(): Promise<SubscriptionPlanInfo | null> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plan as SubscriptionPlanInfo | null;
  }

  async findSubscriptionPlanByName(name: string): Promise<SubscriptionPlanInfo | null> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { name } });
    return plan as SubscriptionPlanInfo | null;
  }

  async findActiveSubscriptionPlans(): Promise<SubscriptionPlanInfo[]> {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans as unknown as SubscriptionPlanInfo[];
  }
}
