import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { prisma } from '@farm/database';

const router = Router();

const adminOnly = authMiddleware({ roles: ['SUPER_ADMIN'] });

function getId(req: Request): string {
  return String(req.params.id);
}

router.get('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: { select: { users: true, farms: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(organizations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
            role: { select: { name: true } },
          },
        },
        farms: {
          select: { id: true, name: true },
        },
        _count: { select: { users: true, farms: true } },
      },
    });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/subscription', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const { subscriptionPlan, subscriptionStatus } = req.body;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionStatus && { subscriptionStatus }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/users', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const users = await prisma.user.findMany({
      where: { organizationId: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/users/:id/toggle-active', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
