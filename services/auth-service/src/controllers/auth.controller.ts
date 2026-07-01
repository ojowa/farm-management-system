import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema } from '@farm/validation';
import { prisma } from '@farm/database';
import jwt from 'jsonwebtoken';

const authService = new AuthService();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
      }
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async me(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.sub },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
          organization: true,
        },
      });
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { passwordHash, ...userWithoutPassword } = fullUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const { fullName, email, avatar } = req.body;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (avatar !== undefined) updateData.avatar = avatar;

      const updated = await prisma.user.update({
        where: { id: user.sub },
        data: updateData,
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
          organization: true,
        },
      });
      const { passwordHash, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update profile' });
    }
  }

  async myOrganizations(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const memberships = await prisma.userOrganization.findMany({
        where: { userId: user.sub, isActive: true },
        include: { organization: true },
        orderBy: { isDefault: 'desc' },
      });
      res.json(memberships.map(m => ({
        ...m.organization,
        roleInOrg: m.roleInOrg,
        isDefault: m.isDefault,
        membershipId: m.id,
      })));
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  }

  async switchOrganization(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ message: 'organizationId required' });
    }
    try {
      const membership = await prisma.userOrganization.findUnique({
        where: { userId_organizationId: { userId: user.sub, organizationId } },
      });
      if (!membership || !membership.isActive) {
        return res.status(403).json({ message: 'Not a member of this organization' });
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: user.sub },
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
          organization: true,
        },
      });
      if (!fullUser) return res.status(404).json({ message: 'User not found' });

      // Re-issue tokens with the new organization context
      const permissions = fullUser.role.permissions.map((rp: any) => rp.permission.name);
      const accessToken = jwt.sign(
        {
          sub: fullUser.id,
          email: fullUser.email,
          role: fullUser.role.name,
          organizationId,
          permissions,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const refreshToken = jwt.sign(
        { sub: fullUser.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Persist refresh token
      await prisma.refreshToken.create({
        data: { token: refreshToken, userId: fullUser.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      const { passwordHash, ...userWithoutPassword } = fullUser;
      // Override the org fields with the switched org
      (userWithoutPassword as any).organizationId = organizationId;
      (userWithoutPassword as any).organization = await prisma.organization.findUnique({ where: { id: organizationId } });

      res.json({ user: userWithoutPassword, accessToken, refreshToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to switch organization' });
    }
  }
}
