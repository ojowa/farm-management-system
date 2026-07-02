import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard, superAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: { _count: { select: { organizations: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      plans: plans.map((p) => ({
        id: p.id, name: p.name, displayName: p.displayName, description: p.description,
        price: p.price, currency: p.currency, billingCycle: p.billingCycle,
        maxUsers: p.maxUsers, maxFarms: p.maxFarms, maxStorage: p.maxStorage,
        features: p.features, isActive: p.isActive, sortOrder: p.sortOrder,
        organizationCount: p._count.organizations, createdAt: p.createdAt, updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('List plans error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        organizations: { select: { id: true, name: true, subscriptionStatus: true }, take: 10 },
        _count: { select: { organizations: true } },
      },
    });

    if (!plan) { res.status(404).json({ statusCode: 404, message: 'Plan not found' }); return; }

    res.json({
      id: plan.id, name: plan.name, displayName: plan.displayName, description: plan.description,
      price: plan.price, currency: plan.currency, billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers, maxFarms: plan.maxFarms, maxStorage: plan.maxStorage,
      features: plan.features, isActive: plan.isActive, sortOrder: plan.sortOrder,
      organizations: plan.organizations, organizationCount: plan._count.organizations,
      createdAt: plan.createdAt, updatedAt: plan.updatedAt,
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/plans', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const { name, displayName, description, price, currency, billingCycle, maxUsers, maxFarms, maxStorage, features, sortOrder } = req.body;
    if (!name || !displayName) { res.status(400).json({ statusCode: 400, message: 'name and displayName are required' }); return; }

    const existingPlan = await prisma.subscriptionPlan.findUnique({ where: { name } });
    if (existingPlan) { res.status(409).json({ statusCode: 409, message: 'Plan with this name already exists' }); return; }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name, displayName, description, price: price || 0, currency: currency || 'USD',
        billingCycle: billingCycle || 'MONTHLY', maxUsers: maxUsers || 5, maxFarms: maxFarms || 1,
        maxStorage: maxStorage || 100, features: features || [], sortOrder: sortOrder || 0,
      },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'subscription.plan.create', entity: 'SubscriptionPlan', entityId: plan.id } });
    res.status(201).json(plan);
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/plans/:id', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { displayName, description, price, currency, billingCycle, maxUsers, maxFarms, maxStorage, features, isActive, sortOrder } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) { res.status(404).json({ statusCode: 404, message: 'Plan not found' }); return; }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }), ...(description !== undefined && { description }),
        ...(price !== undefined && { price }), ...(currency !== undefined && { currency }),
        ...(billingCycle !== undefined && { billingCycle }), ...(maxUsers !== undefined && { maxUsers }),
        ...(maxFarms !== undefined && { maxFarms }), ...(maxStorage !== undefined && { maxStorage }),
        ...(features !== undefined && { features }), ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'subscription.plan.update', entity: 'SubscriptionPlan', entityId: id } });
    res.json(updated);
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.delete('/plans/:id', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) { res.status(404).json({ statusCode: 404, message: 'Plan not found' }); return; }

    const orgCount = await prisma.organization.count({ where: { subscriptionPlanId: id } });
    if (orgCount > 0) {
      res.status(400).json({ statusCode: 400, message: `Cannot delete plan with ${orgCount} organizations. Reassign organizations first.` });
      return;
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'subscription.plan.delete', entity: 'SubscriptionPlan', entityId: id } });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/organizations/:orgId/subscription', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const orgId = getString(req.params.orgId);
    if (!orgId) { res.status(400).json({ statusCode: 400, message: 'Invalid org id' }); return; }
    const { planId, status } = req.body;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    if (planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) { res.status(404).json({ statusCode: 404, message: 'Plan not found' }); return; }
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(planId !== undefined && { subscriptionPlanId: planId }),
        ...(status !== undefined && { subscriptionStatus: status }),
      },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'subscription.assign', entity: 'Organization', entityId: orgId } });
    res.json({ organizationId: orgId, subscriptionPlan: updated.subscriptionPlan, subscriptionStatus: updated.subscriptionStatus });
  } catch (error) {
    console.error('Assign subscription error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
