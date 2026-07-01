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
    const permissions = await prisma.permission.findMany({
      include: {
        _count: { select: { roles: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const p of permissions) {
      const cat = p.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    res.json({ permissions, grouped });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, description, category } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await prisma.permission.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: 'Permission name already exists' });
    }

    const permission = await prisma.permission.create({
      data: { name, description, category },
    });
    res.status(201).json(permission);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const existing = await prisma.permission.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    const roleCount = await prisma.rolePermission.count({ where: { permissionId: id } });
    if (roleCount > 0) {
      return res.status(400).json({ message: 'Cannot delete permission assigned to roles' });
    }

    await prisma.permission.delete({ where: { id } });
    res.json({ message: 'Permission deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
