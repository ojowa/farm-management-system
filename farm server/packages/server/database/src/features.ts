import { PrismaClient } from '@prisma/client';

/**
 * Check if a feature flag is enabled globally.
 */
export async function isFeatureEnabled(
  prisma: PrismaClient,
  key: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  return flag?.isEnabled ?? false;
}

/**
 * Check if a feature flag is enabled for a specific organization.
 * Checks org override first, falls back to global setting.
 */
export async function isFeatureEnabledForOrg(
  prisma: PrismaClient,
  key: string,
  organizationId: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    include: {
      orgOverrides: {
        where: { organizationId },
        select: { isEnabled: true },
      },
    },
  });

  if (!flag) return false;

  // If there's an org-specific override, use it
  if (flag.orgOverrides.length > 0) {
    return flag.orgOverrides[0].isEnabled;
  }

  // Fall back to global setting
  return flag.isEnabled;
}

/**
 * Express middleware that checks if a feature flag is enabled for the current org.
 * Requires rlsMiddleware to have run first (to set organizationId).
 *
 * Usage:
 *   import { featureFlagGuard } from '@farm/database';
 *   router.use('/leave', featureFlagGuard('leave.enabled'), leaveRouter);
 */
export function featureFlagGuard(featureKey: string) {
  return async (req: any, res: any, next: any) => {
    const { getOrganizationId, getIsSuperAdmin } = require('./rls');

    // Super admins bypass feature flag checks
    if (getIsSuperAdmin()) {
      return next();
    }

    const orgId = getOrganizationId();
    if (!orgId) {
      // No org context — allow the request (will be caught by auth middleware if needed)
      return next();
    }

    const { prisma } = require('./clients');
    const isEnabled = await isFeatureEnabledForOrg(prisma, featureKey, orgId);

    if (!isEnabled) {
      return res.status(403).json({
        statusCode: 403,
        message: `Feature '${featureKey}' is not enabled for your organization`,
        featureKey,
      });
    }

    next();
  };
}

/**
 * Check if an organization's subscription allows a specific resource.
 * Returns null if allowed, or an error message if limit exceeded.
 */
export async function checkSubscriptionLimit(
  prisma: PrismaClient,
  organizationId: string,
  resource: 'users' | 'farms'
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscriptionPlanRef: true },
  });

  if (!org) {
    return 'Organization not found';
  }

  if (org.subscriptionStatus === 'SUSPENDED') {
    return 'Organization subscription is suspended';
  }

  const plan = org.subscriptionPlanRef;
  if (!plan) {
    // No plan assigned — use the first active plan as default
    const defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!defaultPlan) return 'No subscription plan configured';

    const count = resource === 'users'
      ? await prisma.user.count({ where: { organizationId } })
      : await prisma.farm.count({ where: { organizationId } });

    const limit = resource === 'users' ? defaultPlan.maxUsers : defaultPlan.maxFarms;
    if (count >= limit) {
      return `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached (${limit}) for ${defaultPlan.name} plan`;
    }

    return null;
  }

  const count = resource === 'users'
    ? await prisma.user.count({ where: { organizationId } })
    : await prisma.farm.count({ where: { organizationId } });

  const limit = resource === 'users' ? plan.maxUsers : plan.maxFarms;
  if (count >= limit) {
    return `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached (${limit}) for ${plan.name} plan`;
  }

  return null;
}

/**
 * Express middleware that checks subscription limits for a resource.
 *
 * Usage:
 *   import { subscriptionLimitGuard } from '@farm/database';
 *   router.post('/users', subscriptionLimitGuard('users'), createUserHandler);
 */
export function subscriptionLimitGuard(resource: 'users' | 'farms') {
  return async (req: any, res: any, next: any) => {
    const { getOrganizationId, getIsSuperAdmin } = require('./rls');

    // Super admins bypass subscription limits
    if (getIsSuperAdmin()) {
      return next();
    }

    const orgId = getOrganizationId();
    if (!orgId) {
      return next();
    }

    const { prisma } = require('./clients');
    const error = await checkSubscriptionLimit(prisma, orgId, resource);

    if (error) {
      return res.status(403).json({
        statusCode: 403,
        message: error,
        resource,
      });
    }

    next();
  };
}

/**
 * Check if an organization's subscription plan allows a specific farm type.
 * Returns null if allowed, or an error message if not permitted.
 */
export async function checkFarmTypeAllowed(
  prisma: PrismaClient,
  organizationId: string,
  farmType: string
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscriptionPlanRef: true },
  });

  if (!org) {
    return 'Organization not found';
  }

  if (org.subscriptionStatus === 'SUSPENDED') {
    return 'Organization subscription is suspended';
  }

  const plan = org.subscriptionPlanRef;
  if (!plan) {
    // No plan assigned — use the first active plan as default
    const defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!defaultPlan) return 'No subscription plan configured';

    const allowedTypes = (defaultPlan.features as any)?.farmTypes ?? ['CROP'];
    if (!allowedTypes.includes(farmType)) {
      return `Farm type '${farmType}' is not available on the ${defaultPlan.name} plan. Allowed: ${allowedTypes.join(', ')}`;
    }
    return null;
  }

  const features = plan.features as any;
  const allowedTypes = features?.farmTypes ?? ['CROP'];

  if (!allowedTypes.includes(farmType)) {
    return `Farm type '${farmType}' is not available on the ${plan.name} plan. Allowed: ${allowedTypes.join(', ')}`;
  }

  return null;
}

/**
 * Express middleware that checks if a farm type is allowed by the org's subscription.
 * Reads farmType from req.body.farmType.
 *
 * Usage:
 *   import { farmTypeGuard } from '@farm/database';
 *   router.post('/farms', subscriptionLimitGuard('farms'), farmTypeGuard, createFarmHandler);
 */
export function farmTypeGuard(req: any, res: any, next: any) {
  const { getOrganizationId, getIsSuperAdmin } = require('./rls');

  // Super admins bypass farm type checks
  if (getIsSuperAdmin()) {
    return next();
  }

  const orgId = getOrganizationId();
  if (!orgId) {
    return next();
  }

  const farmType = req.body?.farmType;
  if (!farmType) {
    // No farmType in request — let validation handle it
    return next();
  }

  const { prisma } = require('./clients');
  checkFarmTypeAllowed(prisma, orgId, farmType).then((error) => {
    if (error) {
      return res.status(403).json({
        statusCode: 403,
        message: error,
        farmType,
      });
    }
    next();
  }).catch((err) => {
    next(err);
  });
}
