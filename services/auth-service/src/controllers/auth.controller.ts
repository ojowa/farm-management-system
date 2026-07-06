import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema } from '@farm/validation';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';
import { auditLog, extractAuditContext } from '../utils/audit';
import {
  generateTOTPSecret,
  enable2FA,
  disable2FA,
} from '../utils/totp';

const authService = new AuthService();

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip || req.socket.remoteAddress || 'unknown';
}

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const ctx = extractAuditContext(req);
      const result = await authService.login(validatedData, {
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await auditLog({
        userId: result.user?.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: result.user?.id,
        metadata: { email: req.body?.email as string || 'unknown', requiresMFA: result.requiresMFA },
        ...ctx,
      });

      if (result.requiresMFA) {
        return res.json({
          requiresMFA: true,
          mfaToken: result.mfaToken,
          user: result.user,
        });
      }

      this.setAuthCookies(res, result.accessToken!, result.refreshToken!);

      res.json({
        requiresMFA: false,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      await auditLog({
        action: 'LOGIN_FAILED',
        entity: 'User',
        metadata: { email: req.body?.email as string || 'unknown', reason: error.message },
        ...extractAuditContext(req),
      });
      res.status(401).json({ message: error.message });
    }
  }

  async verifyMFA(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body;
      if (!mfaToken || !code) {
        return res.status(400).json({ message: 'MFA token and code are required' });
      }

      const ctx = extractAuditContext(req);
      const result = await authService.verifyMFA(mfaToken, code, {
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await auditLog({
        userId: result.user.id,
        action: 'MFA_VERIFY_SUCCESS',
        entity: 'User',
        entityId: result.user.id,
        ...ctx,
      });

      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      await auditLog({
        action: 'MFA_VERIFY_FAILED',
        entity: 'User',
        metadata: { reason: error.message },
        ...extractAuditContext(req),
      });
      res.status(401).json({ message: error.message });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const ctx = extractAuditContext(req);
      const result = await authService.register(validatedData, {
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await auditLog({
        userId: result.user.id,
        action: 'REGISTER',
        entity: 'User',
        entityId: result.user.id,
        metadata: { email: validatedData.email },
        ...ctx,
      });

      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(201).json({ user: result.user });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Verification token required' });
      }

      await authService.verifyEmail(token);

      await auditLog({
        action: 'EMAIL_VERIFIED',
        entity: 'User',
        metadata: { token: token.substring(0, 8) + '...' },
        ...extractAuditContext(req),
      });

      res.json({ message: 'Email verified successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
      }

      // Detect token reuse
      const wasReused = await authService.detectRefreshTokenReuse(refreshToken);
      if (wasReused) {
        await auditLog({
          action: 'REFRESH_TOKEN_REUSE_DETECTED',
          entity: 'RefreshToken',
          metadata: { token: refreshToken.substring(0, 8) + '...' },
          ...extractAuditContext(req),
        });
        this.clearAuthCookies(res);
        return res.status(401).json({ message: 'Token reuse detected. All sessions revoked.' });
      }

      const ctx = extractAuditContext(req);
      const result = await authService.refreshToken(refreshToken, {
        ipAddress: ctx.ipAddress,
        deviceInfo: req.headers['user-agent'] as string || undefined,
      });

      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.json({ message: 'Token refreshed' });
    } catch (error: any) {
      this.clearAuthCookies(res);
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
          role: { include: { permissions: { include: { permission: true } } } },
          organization: { include: { subscriptionPlanRef: true } },
        },
      });
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { passwordHash, twoFactorSecret, ...userWithoutPassword } = fullUser as any;
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
      const { firstName, lastName, phone, email, avatar } = req.body;
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone || null;
      if (email !== undefined) updateData.email = email;
      if (avatar !== undefined) updateData.avatar = avatar || null;

      const updated = await prisma.user.update({
        where: { id: user.sub },
        data: updateData,
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
          organization: { include: { subscriptionPlanRef: true } },
        },
      });
      const { passwordHash, twoFactorSecret, ...userWithoutPassword } = updated as any;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update profile' });
    }
  }

  async changePassword(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          message: 'Password must contain uppercase, lowercase, and numbers',
        });
      }

      const fullUser = await prisma.user.findUnique({ where: { id: user.sub } });
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!isValid) {
        await auditLog({
          userId: user.sub,
          action: 'PASSWORD_CHANGE_FAILED',
          entity: 'User',
          entityId: user.sub,
          metadata: { reason: 'Invalid current password' },
          ...extractAuditContext(req),
        });
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.sub },
        data: { passwordHash },
      });

      // Revoke all refresh tokens on password change
      await authService.logoutAllSessions(user.sub);

      await auditLog({
        userId: user.sub,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: user.sub,
        ...extractAuditContext(req),
      });

      // Send password change notification (best-effort)
      try {
        const notifPort = process.env.NOTIFICATION_SERVICE_PORT || 4005;
        await fetch(`http://localhost:${notifPort}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: fullUser.email,
            template: 'passwordReset',
            data: {
              firstName: fullUser.firstName,
              action: 'changed',
              timestamp: new Date().toISOString(),
            },
          }),
        });
      } catch {
        // Best-effort
      }

      // Generate new tokens
      const fullUserUpdated = await prisma.user.findUnique({
        where: { id: user.sub },
        include: { role: true },
      });
      if (fullUserUpdated) {
        const accessToken = (authService as any).generateAccessToken(fullUserUpdated);
        const refreshToken = await authService.generateRefreshToken(user.sub, {
          ipAddress: getClientIP(req),
        });
        this.setAuthCookies(res, accessToken, refreshToken);
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to change password' });
    }
  }

  async getPreferences(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { notificationPreferences: true, twoFactorEnabled: true },
      });
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(fullUser);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch preferences' });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const { notificationPreferences } = req.body;
      const updateData: any = {};
      if (notificationPreferences !== undefined) {
        updateData.notificationPreferences = notificationPreferences;
      }

      const updated = await prisma.user.update({
        where: { id: user.sub },
        data: updateData,
        select: { notificationPreferences: true, twoFactorEnabled: true },
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update preferences' });
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
      res.json(
        memberships.map((m) => ({
          ...m.organization,
          roleInOrg: m.roleInOrg,
          isDefault: m.isDefault,
          membershipId: m.id,
        }))
      );
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  }

  async logout(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      await authService.logout(user.sub);

      await auditLog({
        userId: user.sub,
        action: 'LOGOUT',
        entity: 'User',
        entityId: user.sub,
        ...extractAuditContext(req),
      });

      this.clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to logout' });
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
          organization: { include: { subscriptionPlanRef: true } },
        },
      });
      if (!fullUser) return res.status(404).json({ message: 'User not found' });

      const accessToken = (authService as any).generateAccessToken({
        ...fullUser,
        organizationId,
      });

      const refreshToken = await authService.generateRefreshToken(user.sub, {
        ipAddress: getClientIP(req),
      });

      this.setAuthCookies(res, accessToken, refreshToken);

      const { passwordHash, twoFactorSecret, ...userWithoutPassword } = fullUser as any;
      (userWithoutPassword as any).organizationId = organizationId;
      (userWithoutPassword as any).organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscriptionPlanRef: true },
      });

      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to switch organization' });
    }
  }

  // ── 2FA Endpoints ──────────────────────────────────────

  async generate2FASecret(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const fullUser = await prisma.user.findUnique({ where: { id: user.sub } });
      if (!fullUser) return res.status(404).json({ message: 'User not found' });

      if (fullUser.twoFactorEnabled) {
        return res.status(400).json({ message: '2FA is already enabled. Disable it first.' });
      }

      const result = await generateTOTPSecret(user.sub, fullUser.email || '');
      res.json({
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        message: 'Scan the QR code with your authenticator app, then verify with the code.',
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to generate 2FA secret' });
    }
  }

  async enable2FAEndpoint(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Verification code is required' });
      }

      await enable2FA(user.sub, code);

      await auditLog({
        userId: user.sub,
        action: '2FA_ENABLED',
        entity: 'User',
        entityId: user.sub,
        ...extractAuditContext(req),
      });

      res.json({ message: '2FA enabled successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async disable2FAEndpoint(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Current MFA code is required to disable 2FA' });
      }

      await disable2FA(user.sub, code);

      await auditLog({
        userId: user.sub,
        action: '2FA_DISABLED',
        entity: 'User',
        entityId: user.sub,
        ...extractAuditContext(req),
      });

      res.json({ message: '2FA disabled successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getSessions(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const sessions = await authService.getActiveSessions(user.sub);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  }

  async revokeSession(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      const tokenId = req.params.tokenId as string;
      await authService.revokeSession(user.sub, tokenId);
      res.json({ message: 'Session revoked' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to revoke session' });
    }
  }

  async revokeAllSessions(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || !user.sub) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    try {
      await authService.logoutAllSessions(user.sub);
      await auditLog({
        userId: user.sub,
        action: 'ALL_SESSIONS_REVOKED',
        entity: 'User',
        entityId: user.sub,
        ...extractAuditContext(req),
      });
      res.json({ message: 'All sessions revoked' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to revoke sessions' });
    }
  }

  // ── Cookie Helpers ─────────────────────────────────────

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }
}
