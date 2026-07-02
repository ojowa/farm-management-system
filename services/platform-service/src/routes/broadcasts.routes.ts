import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard, superAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005';

async function sendBroadcastViaNotificationService(broadcast: {
  id: string;
  title: string;
  message: string;
  type: string;
  targetOrgs: string[];
  createdById: string;
}) {
  try {
    // Find users to target
    const userWhere: any = { isActive: true };
    if (broadcast.targetOrgs.length > 0) {
      userWhere.organizationId = { in: broadcast.targetOrgs };
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (users.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) =>
          fetch(`${NOTIFICATION_SERVICE_URL}/api/v1/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              title: broadcast.title,
              message: broadcast.message,
              type: 'PLATFORM_BROADCAST',
              channel: 'IN_APP',
              data: { broadcastId: broadcast.id, broadcastType: broadcast.type },
            }),
          })
        )
      );
      sent += results.filter((r) => r.status === 'fulfilled').length;
      failed += results.filter((r) => r.status === 'rejected').length;
    }

    return { sent, failed };
  } catch (error) {
    console.error('Broadcast delivery error:', error);
    return { sent: 0, failed: -1 };
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({
      broadcasts: broadcasts.map((b) => ({
        id: b.id, title: b.title, message: b.message, type: b.type, targetOrgs: b.targetOrgs,
        isActive: b.isActive, startsAt: b.startsAt, expiresAt: b.expiresAt,
        createdById: b.createdById, createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error('List broadcasts error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) { res.status(404).json({ statusCode: 404, message: 'Broadcast not found' }); return; }

    res.json({
      id: broadcast.id, title: broadcast.title, message: broadcast.message, type: broadcast.type,
      targetOrgs: broadcast.targetOrgs, isActive: broadcast.isActive, startsAt: broadcast.startsAt,
      expiresAt: broadcast.expiresAt, createdById: broadcast.createdById, createdAt: broadcast.createdAt,
    });
  } catch (error) {
    console.error('Get broadcast error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const { title, message, type, targetOrgs, expiresAt } = req.body;
    const adminUser = (req as any).user;

    if (!title || !message) { res.status(400).json({ statusCode: 400, message: 'title and message are required' }); return; }

    const broadcast = await prisma.broadcast.create({
      data: {
        title, message, type: type || 'INFO', targetOrgs: targetOrgs || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null, createdById: adminUser.id,
      },
    });

    const delivery = await sendBroadcastViaNotificationService({
      id: broadcast.id, title, message, type: broadcast.type,
      targetOrgs: broadcast.targetOrgs, createdById: adminUser.id,
    });

    await prisma.auditLog.create({
      data: { userId: adminUser.id, action: 'broadcast.create', entity: 'Broadcast', entityId: broadcast.id },
    });

    res.status(201).json({ ...broadcast, delivery });
  } catch (error) {
    console.error('Create broadcast error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/:id', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { title, message, type, targetOrgs, isActive, expiresAt } = req.body;

    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) { res.status(404).json({ statusCode: 404, message: 'Broadcast not found' }); return; }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }), ...(message !== undefined && { message }), ...(type !== undefined && { type }),
        ...(targetOrgs !== undefined && { targetOrgs }), ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'broadcast.update', entity: 'Broadcast', entityId: id } });
    res.json(updated);
  } catch (error) {
    console.error('Update broadcast error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.delete('/:id', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) { res.status(404).json({ statusCode: 404, message: 'Broadcast not found' }); return; }

    await prisma.broadcast.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'broadcast.delete', entity: 'Broadcast', entityId: id } });
    res.json({ message: 'Broadcast deleted successfully' });
  } catch (error) {
    console.error('Delete broadcast error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
