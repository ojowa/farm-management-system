import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard, superAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = getString(req.query.search);
    const status = getString(req.query.status);
    const plan = getString(req.query.plan);
    const page = parseInt(getString(req.query.page) || '1', 10);
    const limit = parseInt(getString(req.query.limit) || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.subscriptionStatus = status;
    if (plan) where.subscriptionPlan = plan;

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

    res.json({
      organizations: organizations.map((o) => ({
        id: o.id, name: o.name, slug: o.slug, email: o.email, phone: o.phone, industry: o.industry,
        subscriptionPlan: o.subscriptionPlan, subscriptionStatus: o.subscriptionStatus,
        userCount: o._count.users, farmCount: o._count.farms, createdAt: o.createdAt,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List organizations error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, farms: true } } },
    });

    if (!organization) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    const featureOverrides = await prisma.featureFlagOverride.findMany({
      where: { organizationId: id },
      include: { featureFlag: true },
    });

    res.json({
      id: organization.id, name: organization.name, slug: organization.slug, email: organization.email,
      phone: organization.phone, logo: organization.logo, website: organization.website, industry: organization.industry,
      subscriptionPlan: organization.subscriptionPlan, subscriptionStatus: organization.subscriptionStatus,
      settings: organization.settings, userCount: organization._count.users, farmCount: organization._count.farms,
      featureOverrides: featureOverrides.map((fo) => ({
        featureKey: fo.featureFlag.key, featureName: fo.featureFlag.name, isEnabled: fo.isEnabled,
      })),
      createdAt: organization.createdAt, updatedAt: organization.updatedAt,
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const { name, slug, email, phone, industry, subscriptionPlan } = req.body;
    if (!name || !slug) { res.status(400).json({ statusCode: 400, message: 'Name and slug are required' }); return; }

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) { res.status(409).json({ statusCode: 409, message: 'Organization with this slug already exists' }); return; }

    const organization = await prisma.organization.create({
      data: { name, slug, email, phone, industry, subscriptionPlan: subscriptionPlan || 'FREE', subscriptionStatus: 'TRIAL' },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'organization.create', entity: 'Organization', entityId: organization.id } });
    res.status(201).json(organization);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { name, email, phone, logo, website, industry, settings } = req.body;

    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }), ...(email !== undefined && { email }), ...(phone !== undefined && { phone }),
        ...(logo !== undefined && { logo }), ...(website !== undefined && { website }), ...(industry !== undefined && { industry }),
        ...(settings !== undefined && { settings }),
      },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'organization.update', entity: 'Organization', entityId: id } });
    res.json(updatedOrg);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.delete('/:id', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    const userCount = await prisma.user.count({ where: { organizationId: id } });
    if (userCount > 0) {
      res.status(400).json({ statusCode: 400, message: `Cannot delete organization with ${userCount} users. Remove all users first.` });
      return;
    }

    await prisma.organization.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'organization.delete', entity: 'Organization', entityId: id } });
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/:id/suspend', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'SUSPENDED' } });
    await prisma.userSession.updateMany({ where: { user: { organizationId: id } }, data: { isActive: false, logoutAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'organization.suspend', entity: 'Organization', entityId: id } });
    res.json({ message: 'Organization suspended successfully' });
  } catch (error) {
    console.error('Suspend organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/:id/activate', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    await prisma.organization.update({ where: { id }, data: { subscriptionStatus: 'ACTIVE' } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'organization.activate', entity: 'Organization', entityId: id } });
    res.json({ message: 'Organization activated successfully' });
  } catch (error) {
    console.error('Activate organization error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingOrg = await prisma.organization.findUnique({ where: { id } });
    if (!existingOrg) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    const [userCount, farmCount, activeSessions] = await Promise.all([
      prisma.user.count({ where: { organizationId: id } }),
      prisma.farm.count({ where: { organizationId: id } }),
      prisma.userSession.count({ where: { user: { organizationId: id }, isActive: true } }),
    ]);

    res.json({ organizationId: id, userCount, farmCount, activeSessions });
  } catch (error) {
    console.error('Get org stats error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const members = await prisma.user.findMany({
      where: { organizationId: id },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      members: members.map((m) => ({
        id: m.id, email: m.email, firstName: m.firstName, lastName: m.lastName, role: m.role.name,
        isActive: m.isActive, lastLoginAt: m.lastLoginAt, createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get org members error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
