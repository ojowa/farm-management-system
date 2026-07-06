import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@farm/database';
import { platformAdminGuard } from '../middleware/platform-admin.guard';

const router = Router();
const getJWTSecret = (): string => process.env.JWT_SECRET || 'secret';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ statusCode: 400, message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      res.status(401).json({ statusCode: 401, message: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ statusCode: 403, message: 'Account is deactivated' });
      return;
    }

    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role.name)) {
      res.status(403).json({ statusCode: 403, message: 'Platform admin access required' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ statusCode: 401, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role.name, organizationId: user.organizationId, isPlatformAdmin: true },
      getJWTSecret(),
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({
      accessToken: token,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name, organizationId: user.organizationId },
    });
  } catch (error) {
    console.error('Platform login error:', error);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ statusCode: 400, message: 'Refresh token is required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, getJWTSecret()) as any;
    if (decoded.type !== 'refresh') {
      res.status(401).json({ statusCode: 401, message: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, include: { role: true } });
    if (!user || !user.isActive) {
      res.status(401).json({ statusCode: 401, message: 'User not found or deactivated' });
      return;
    }

    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role.name)) {
      res.status(403).json({ statusCode: 403, message: 'Platform admin access required' });
      return;
    }

    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role.name, organizationId: user.organizationId, isPlatformAdmin: true },
      getJWTSecret(),
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ statusCode: 401, message: 'Invalid or expired refresh token' });
  }
});

router.get('/me', platformAdminGuard, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true, organization: true },
    });

    if (!dbUser) {
      res.status(404).json({ statusCode: 404, message: 'User not found' });
      return;
    }

    res.json({
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role.name,
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization?.name ?? null,
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
});

export default router;
