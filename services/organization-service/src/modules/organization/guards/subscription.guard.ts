import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { scopedPrisma } from '@farm/database';

export const SUBSCRIPTION_RESOURCE_KEY = 'subscription_resource';

export function SubscriptionLimitGuard(resource: 'users' | 'farms') {
  return function (target: any, propertyKey?: string, descriptor?: any) {
    if (descriptor) {
      Reflect.metadata(SUBSCRIPTION_RESOURCE_KEY, resource)(descriptor.value);
      return descriptor;
    }
    Reflect.metadata(SUBSCRIPTION_RESOURCE_KEY, resource)(target);
    return target;
  };
}

@Injectable()
export class SubscriptionLimitActivationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>(SUBSCRIPTION_RESOURCE_KEY, context.getHandler());
    if (!resource) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT_ADMIN') {
      return true;
    }

    const organizationId = user?.organizationId;
    if (!organizationId) return true;

    const org = await scopedPrisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscriptionPlanRef: true },
    });

    if (!org) throw new ForbiddenException('Organization not found');
    if (org.subscriptionStatus === 'SUSPENDED') throw new ForbiddenException('Organization subscription is suspended');

    const plan = org.subscriptionPlanRef;
    const limit = resource === 'users'
      ? (plan?.maxUsers ?? 3)
      : (plan?.maxFarms ?? 1);

    const count = resource === 'users'
      ? await scopedPrisma.user.count({ where: { organizationId } })
      : await scopedPrisma.farm.count({ where: { organizationId } });

    if (count >= limit) {
      throw new ForbiddenException(
        `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached (${limit}) for ${plan?.name ?? 'FREE'} plan`,
      );
    }

    return true;
  }
}
