import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { platformAdminGuard, superAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
router.use(platformAdminGuard);

const getString = (val: unknown): string | undefined => (typeof val === 'string' ? val : undefined);

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = getString(req.query.search);
    const role = getString(req.query.role);
    const orgId = getString(req.query.orgId);
    const page = parseInt(getString(req.query.page) || '1', 10);
    const limit = parseInt(getString(req.query.limit) || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = { name: role };
    if (orgId) where.organizationId = orgId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, organization: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone,
        role: u.role.name, organizationId: u.organizationId, organizationName: u.organization?.name ?? null,
        isActive: u.isActive, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, organization: true },
    });

    if (!user) { res.status(404).json({ statusCode: 404, message: 'User not found' }); return; }

    const sessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { loginAt: 'desc' },
      take: 10,
    });

    res.json({
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone,
      role: user.role.name, organizationId: user.organizationId, organizationName: user.organization?.name ?? null,
      isActive: user.isActive, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      sessions: sessions.map((s) => ({
        id: s.id, app: s.app, ipAddress: s.ipAddress, isActive: s.isActive,
        loginAt: s.loginAt, lastActive: s.lastActive, logoutAt: s.logoutAt,
      })),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const { firstName, lastName, phone, email, isActive, roleId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) { res.status(404).json({ statusCode: 404, message: 'User not found' }); return; }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(isActive !== undefined && { isActive }),
        ...(roleId !== undefined && { roleId }),
      },
      include: { role: true, organization: true },
    });

    await prisma.auditLog.create({
      data: { userId: (req as any).user.id, action: 'user.update', entity: 'User', entityId: id },
    });

    res.json({
      id: updatedUser.id, email: updatedUser.email, firstName: updatedUser.firstName, lastName: updatedUser.lastName,
      phone: updatedUser.phone, role: updatedUser.role.name, organizationId: updatedUser.organizationId,
      organizationName: updatedUser.organization?.name ?? null, isActive: updatedUser.isActive,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) { res.status(404).json({ statusCode: 404, message: 'User not found' }); return; }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await prisma.userSession.updateMany({ where: { userId: id, isActive: true }, data: { isActive: false, logoutAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'user.deactivate', entity: 'User', entityId: id } });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/:id/impersonate', superAdminGuard, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }
    const adminUser = (req as any).user;

    const targetUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!targetUser) { res.status(404).json({ statusCode: 404, message: 'Target user not found' }); return; }
    if (!targetUser.isActive) { res.status(400).json({ statusCode: 400, message: 'Cannot impersonate inactive user' }); return; }

    const jwt = require('jsonwebtoken');
    const getJWTSecret = (): string => process.env.JWT_SECRET || 'secret';
    const impersonationToken = jwt.sign(
      { sub: targetUser.id, email: targetUser.email, role: targetUser.role.name, organizationId: targetUser.organizationId, impersonatorId: adminUser.id, isImpersonation: true },
      getJWTSecret(), { expiresIn: '1h' }
    );

    await prisma.auditLog.create({ data: { userId: adminUser.id, action: 'user.impersonate', entity: 'User', entityId: id } });

    res.json({
      impersonationToken,
      targetUser: { id: targetUser.id, email: targetUser.email, firstName: targetUser.firstName, lastName: targetUser.lastName, role: targetUser.role.name, organizationId: targetUser.organizationId },
    });
  } catch (error) {
    console.error('Impersonate user error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/:id/force-logout', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) { res.status(404).json({ statusCode: 404, message: 'User not found' }); return; }

    const result = await prisma.userSession.updateMany({ where: { userId: id, isActive: true }, data: { isActive: false, logoutAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: (req as any).user.id, action: 'user.force-logout', entity: 'User', entityId: id } });

    res.json({ message: 'All sessions terminated', sessionsTerminated: result.count });
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.get('/:id/sessions', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) { res.status(400).json({ statusCode: 400, message: 'Invalid id' }); return; }

    const sessions = await prisma.userSession.findMany({ where: { userId: id }, orderBy: { loginAt: 'desc' } });
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
