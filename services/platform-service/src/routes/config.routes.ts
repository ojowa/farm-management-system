import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard, superAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.platformConfig.findMany({ orderBy: { category: 'asc' } });
    res.json({ configs });
  } catch (error) {
    console.error('List configs error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:key', async (req: Request, res: Response) => {
  try {
    const key = getString(req.params.key);
    if (!key) { res.status(400).json({ statusCode: 400, message: 'Invalid key' }); return; }

    const config = await prisma.platformConfig.findUnique({ where: { key } });
    if (!config) { res.status(404).json({ statusCode: 404, message: 'Config not found' }); return; }
    res.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const { configs } = req.body;
    if (!Array.isArray(configs)) {
      res.status(400).json({ statusCode: 400, message: 'configs must be an array of { key, value }' });
      return;
    }

    const results = [];
    for (const { key, value, description, category } of configs) {
      const updated = await prisma.platformConfig.upsert({
        where: { key },
        update: { value, ...(description !== undefined && { description }), ...(category !== undefined && { category }) },
        create: { key, value, description: description || null, category: category || 'general' },
      });
      results.push(updated);
    }

    await prisma.auditLog.create({
      data: { userId: (req as any).user.id, action: 'config.update', entity: 'PlatformConfig', entityId: 'bulk' },
    });

    res.json({ configs: results });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
