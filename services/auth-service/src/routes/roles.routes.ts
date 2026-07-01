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
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { permissions: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await prisma.role.findFirst({ where: { name, organizationId: null } });
    if (existing) {
      return res.status(409).json({ message: 'Role name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        organizationId: null,
        description: description || null,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((id: string) => ({
                permission: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { permissions: true, users: true } },
      },
    });

    res.status(201).json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { permissions: true, users: true } },
      },
    });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const { name, description } = req.body;
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (existing.isSystem && name && name !== existing.name) {
      return res.status(400).json({ message: 'Cannot rename system roles' });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { permissions: true, users: true } },
      },
    });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (existing.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system roles' });
    }
    if (existing._count.users > 0) {
      return res.status(400).json({ message: 'Cannot delete role with assigned users' });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    res.json({ message: 'Role deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/permissions', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'permissionIds must be an array' });
    }

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { permissions: true, users: true } },
      },
    });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
