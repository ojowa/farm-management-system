import { prisma } from '@farm/database';
import { Organization, CreateOrganizationRequest, OrganizationSettings } from '@farm/types';

const asPlan = (plan: string | undefined): 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' => {
  const allowed = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'] as const;
  return (allowed.includes(plan as typeof allowed[number]) ? (plan as typeof allowed[number]) : 'FREE');
};

const defaultSettings: OrganizationSettings = {
  currency: 'USD',
  timezone: 'UTC',
  language: 'en',
  measurementUnit: 'METRIC',
  dateFormat: 'YYYY-MM-DD',
};

const toJson = (value: unknown): any => value as any;

export class OrganizationRepository {
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.adminEmail,
        subscriptionPlan: asPlan(data.subscriptionPlan),
        subscriptionStatus: 'TRIAL',
        settings: toJson(defaultSettings),
      },
    }) as unknown as Promise<Organization>;
  }

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    }) as unknown as Promise<Organization | null>;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { slug },
    }) as unknown as Promise<Organization | null>;
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

  async findAll(): Promise<Organization[]> {
    return prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<Organization[]>;
  }

  async delete(id: string): Promise<void> {
    await prisma.organization.delete({
      where: { id },
    });
  }
}
