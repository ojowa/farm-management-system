import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/', async (req: Request, res: Response) => {
  try {
    const action = getString(req.query.action);
    const entity = getString(req.query.entity);
    const userId = getString(req.query.userId);
    const startDate = getString(req.query.startDate);
    const endDate = getString(req.query.endDate);
    const page = parseInt(getString(req.query.page) || '1', 10);
    const limit = parseInt(getString(req.query.limit) || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs: logs.map((l) => ({
        id: l.id, userId: l.userId,
        userName: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System',
        userEmail: l.user?.email, action: l.action, entity: l.entity, entityId: l.entityId, createdAt: l.createdAt,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });

    if (!log) { res.status(404).json({ statusCode: 404, message: 'Audit log not found' }); return; }

    res.json({
      id: log.id, userId: log.userId, user: log.user,
      action: log.action, entity: log.entity, entityId: log.entityId, createdAt: log.createdAt,
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
