import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const features = await prisma.featureFlag.findMany({
      include: {
        orgOverrides: { include: { organization: { select: { id: true, name: true } } } },
        _count: { select: { orgOverrides: true } },
      },
      orderBy: { category: 'asc' },
    });

    res.json({
      features: features.map((f) => ({
        id: f.id, key: f.key, name: f.name, description: f.description, category: f.category,
        defaultValue: f.defaultValue, isEnabled: f.isEnabled, overrideCount: f._count.orgOverrides,
        overrides: f.orgOverrides.map((o) => ({ organizationId: o.organizationId, organizationName: o.organization.name, isEnabled: o.isEnabled })),
        createdAt: f.createdAt, updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error('List features error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const feature = await prisma.featureFlag.findUnique({
      where: { id },
      include: { orgOverrides: { include: { organization: { select: { id: true, name: true } } } } },
    });

    if (!feature) { res.status(404).json({ statusCode: 404, message: 'Feature flag not found' }); return; }

    res.json({
      id: feature.id, key: feature.key, name: feature.name, description: feature.description,
      category: feature.category, defaultValue: feature.defaultValue, isEnabled: feature.isEnabled,
      overrides: feature.orgOverrides.map((o) => ({
        organizationId: o.organizationId, organizationName: o.organization.name, isEnabled: o.isEnabled, createdAt: o.createdAt,
      })),
      createdAt: feature.createdAt, updatedAt: feature.updatedAt,
    });
  } catch (error) {
    console.error('Get feature error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { isEnabled, name, description } = req.body;

    const feature = await prisma.featureFlag.findUnique({ where: { id } });
    if (!feature) { res.status(404).json({ statusCode: 404, message: 'Feature flag not found' }); return; }

    const updated = await prisma.featureFlag.update({
      where: { id },
      data: { ...(isEnabled !== undefined && { isEnabled }), ...(name !== undefined && { name }), ...(description !== undefined && { description }) },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'feature.toggle', entity: 'FeatureFlag', entityId: id } });
    res.json(updated);
  } catch (error) {
    console.error('Update feature error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id/overrides', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const overrides = await prisma.featureFlagOverride.findMany({
      where: { featureFlagId: id },
      include: { organization: { select: { id: true, name: true } } },
    });

    res.json({
      overrides: overrides.map((o) => ({ id: o.id, organizationId: o.organizationId, organizationName: o.organization.name, isEnabled: o.isEnabled, createdAt: o.createdAt })),
    });
  } catch (error) {
    console.error('Get overrides error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/:id/overrides', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { organizationId, isEnabled } = req.body;

    if (!organizationId || isEnabled === undefined) {
      res.status(400).json({ statusCode: 400, message: 'organizationId and isEnabled are required' }); return;
    }

    const feature = await prisma.featureFlag.findUnique({ where: { id } });
    if (!feature) { res.status(404).json({ statusCode: 404, message: 'Feature flag not found' }); return; }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) { res.status(404).json({ statusCode: 404, message: 'Organization not found' }); return; }

    const override = await prisma.featureFlagOverride.upsert({
      where: { featureFlagId_organizationId: { featureFlagId: id, organizationId } },
      update: { isEnabled },
      create: { featureFlagId: id, organizationId, isEnabled },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'feature.override.set', entity: 'FeatureFlagOverride', entityId: override.id } });
    res.json(override);
  } catch (error) {
    console.error('Set override error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.delete('/:id/overrides/:orgId', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    const orgId = getString(req.params.orgId);
    if (!id || !orgId) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const override = await prisma.featureFlagOverride.findUnique({
      where: { featureFlagId_organizationId: { featureFlagId: id, organizationId: orgId } },
    });

    if (!override) { res.status(404).json({ statusCode: 404, message: 'Override not found' }); return; }

    await prisma.featureFlagOverride.delete({
      where: { featureFlagId_organizationId: { featureFlagId: id, organizationId: orgId } },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'feature.override.delete', entity: 'FeatureFlagOverride', entityId: override.id } });
    res.json({ message: 'Override removed successfully' });
  } catch (error) {
    console.error('Delete override error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
