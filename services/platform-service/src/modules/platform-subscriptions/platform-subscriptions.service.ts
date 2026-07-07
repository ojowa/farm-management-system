import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformSubscriptionsService {
  async findAllPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      include: { _count: { select: { organizations: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        price: p.price,
        currency: p.currency,
        billingCycle: p.billingCycle,
        maxUsers: p.maxUsers,
        maxFarms: p.maxFarms,
        maxStorage: p.maxStorage,
        features: p.features,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
        organizationCount: p._count.organizations,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }

  async findOnePlan(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        organizations: { select: { id: true, name: true, subscriptionStatus: true }, take: 10 },
        _count: { select: { organizations: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers,
      maxFarms: plan.maxFarms,
      maxStorage: plan.maxStorage,
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      organizations: plan.organizations,
      organizationCount: plan._count.organizations,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  async createPlan(
    data: {
      name: string;
      displayName: string;
      description?: string;
      price?: number;
      currency?: string;
      billingCycle?: string;
      maxUsers?: number;
      maxFarms?: number;
      maxStorage?: number;
      features?: any;
      sortOrder?: number;
    },
    auditUserId: string,
  ) {
    if (!data.name || !data.displayName) {
      throw new BadRequestException('name and displayName are required');
    }

    const existingPlan = await prisma.subscriptionPlan.findUnique({ where: { name: data.name } });
    if (existingPlan) {
      throw new ConflictException('Plan with this name already exists');
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        price: data.price || 0,
        currency: data.currency || 'USD',
        billingCycle: data.billingCycle || 'MONTHLY',
        maxUsers: data.maxUsers || 5,
        maxFarms: data.maxFarms || 1,
        maxStorage: data.maxStorage || 100,
        features: data.features || [],
        sortOrder: data.sortOrder || 0,
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'subscription.plan.create', entity: 'SubscriptionPlan', entityId: plan.id },
    });

    return plan;
  }

  async updatePlan(
    id: string,
    data: {
      displayName?: string;
      description?: string;
      price?: number;
      currency?: string;
      billingCycle?: string;
      maxUsers?: number;
      maxFarms?: number;
      maxStorage?: number;
      features?: any;
      isActive?: boolean;
      sortOrder?: number;
    },
    auditUserId: string,
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.billingCycle !== undefined && { billingCycle: data.billingCycle }),
        ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
        ...(data.maxFarms !== undefined && { maxFarms: data.maxFarms }),
        ...(data.maxStorage !== undefined && { maxStorage: data.maxStorage }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'subscription.plan.update', entity: 'SubscriptionPlan', entityId: id },
    });

    return updated;
  }

  async deletePlan(id: string, auditUserId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const orgCount = await prisma.organization.count({ where: { subscriptionPlanId: id } });
    if (orgCount > 0) {
      throw new BadRequestException(`Cannot delete plan with ${orgCount} organizations. Reassign organizations first.`);
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'subscription.plan.delete', entity: 'SubscriptionPlan', entityId: id },
    });

    return { message: 'Plan deleted successfully' };
  }

  async assignSubscription(
    orgId: string,
    data: { planId?: string; status?: string },
    auditUserId: string,
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (data.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.planId !== undefined && { subscriptionPlanId: data.planId }),
        ...(data.status !== undefined && { subscriptionStatus: data.status }),
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'subscription.assign', entity: 'Organization', entityId: orgId },
    });

    return {
      organizationId: orgId,
      subscriptionPlan: updated.subscriptionPlan,
      subscriptionStatus: updated.subscriptionStatus,
    };
  }
}
