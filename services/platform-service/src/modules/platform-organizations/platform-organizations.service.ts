import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformOrganizationsService {
  async findAll(query: { page?: number; limit?: number; search?: string; status?: string; plan?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.subscriptionStatus = query.status;
    if (query.plan) where.subscriptionPlan = query.plan;

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: { _count: { select: { users: true, farms: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        email: o.email,
        phone: o.phone,
        industry: o.industry,
        subscriptionPlan: o.subscriptionPlan,
        subscriptionStatus: o.subscriptionStatus,
        userCount: o._count.users,
        farmCount: o._count.farms,
        createdAt: o.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, farms: true } } },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const featureOverrides = await prisma.featureFlagOverride.findMany({
      where: { organizationId: id },
      include: { featureFlag: true },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      email: organization.email,
      phone: organization.phone,
      logo: organization.logo,
      website: organization.website,
      industry: organization.industry,
      subscriptionPlan: organization.subscriptionPlan,
      subscriptionStatus: organization.subscriptionStatus,
      settings: organization.settings,
      userCount: organization._count.users,
      farmCount: organization._count.farms,
      featureOverrides: featureOverrides.map((fo) => ({
        featureKey: fo.featureFlag.key,
        featureName: fo.featureFlag.name,
        isEnabled: fo.isEnabled,
      })),
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  async create(
    data: { name: string; slug: string; email?: string; phone?: string; industry?: string; subscriptionPlan?: string },
    auditUserId: string,
  ) {
    if (!data.name || !data.slug) {
      throw new BadRequestException('Name and slug are required');
    }

    const existingOrg = await prisma.organization.findUnique({ where: { slug: data.slug } });
    if (existingOrg) {
      throw new ConflictException('Organization with this slug already exists');
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        industry: data.industry,
        subscriptionPlan: data.subscriptionPlan || 'FREE',
        subscriptionStatus: 'TRIAL',
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'organization.create', entity: 'Organization', entityId: organization.id },
    });

    return organization;
  }

  async update(
    id: string,
    data: { name?: string; email?: string; phone?: string; logo?: string; website?: string; industry?: string; settings?: any },
    auditUserId: string,
  ) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'organization.update', entity: 'Organization', entityId: id },
    });

    return updatedOrg;
  }

  async delete(id: string, auditUserId: string) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    const userCount = await prisma.user.count({ where: { organizationId: id } });
    if (userCount > 0) {
      throw new BadRequestException(`Cannot delete organization with ${userCount} users. Remove all users first.`);
    }

    await prisma.organization.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'organization.delete', entity: 'Organization', entityId: id },
    });

    return { message: 'Organization deleted successfully' };
  }

  async suspend(id: string, auditUserId: string) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'SUSPENDED' } });
    await prisma.userSession.updateMany({
      where: { user: { organizationId: id } },
      data: { isActive: false, logoutAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'organization.suspend', entity: 'Organization', entityId: id },
    });

    return { message: 'Organization suspended successfully' };
  }

  async activate(id: string, auditUserId: string) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'ACTIVE' } });
    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'organization.activate', entity: 'Organization', entityId: id },
    });

    return { message: 'Organization activated successfully' };
  }

  async getStats(id: string) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    const [userCount, farmCount, activeSessions] = await Promise.all([
      prisma.user.count({ where: { organizationId: id } }),
      prisma.farm.count({ where: { organizationId: id } }),
      prisma.userSession.count({ where: { user: { organizationId: id }, isActive: true } }),
    ]);

    return { organizationId: id, userCount, farmCount, activeSessions };
  }

  async getMembers(id: string) {
    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    const members = await prisma.user.findMany({
      where: { organizationId: id },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role.name,
        isActive: m.isActive,
        lastLoginAt: m.lastLoginAt,
        createdAt: m.createdAt,
      })),
    };
  }
}
