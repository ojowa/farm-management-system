import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@farm/database';

/**
 * Platform admin service — intentionally uses unscoped `prisma` (bypasses RLS)
 * because platform admins need cross-organization access. Access is controlled
 * by @Permission('platform.manage') guard at the controller level.
 */
@Injectable()
export class AdminService {
  async listOrganizations() {
    return prisma.organization.findMany({
      include: {
        _count: { select: { users: true, farms: true } },
      },
    });
  }

  async getOrganization(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: true,
        farms: true,
        _count: { select: { users: true, farms: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrganizationSubscription(id: string, data: { subscriptionPlan: string; subscriptionStatus: string }) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { name: data.subscriptionPlan } });
    if (!plan) {
      throw new BadRequestException(`Subscription plan '${data.subscriptionPlan}' does not exist`);
    }

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    return prisma.organization.update({
      where: { id },
      data: {
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionPlanId: plan.id,
      },
    });
  }

  async listOrganizationUsers(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        role: true,
      },
    });
  }

  async toggleUserActive(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }
}
