import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginCredentials } from '@farm/types';
import { hashToken, generateSecureToken, generateJTI, generateVerificationToken } from '../utils/tokens';
import { blacklistToken, isTokenBlacklisted } from '../utils/blacklist';
import { isMFALockedOut, recordMFAFailure, resetMFAAttempts } from '../utils/lockout';

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
};
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRY_DAYS = 7;

export class AuthService {
  async login(credentials: LoginCredentials, context?: { ipAddress?: string; userAgent?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        organization: { include: { subscriptionPlanRef: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Check MFA lockout
      const lockout = isMFALockedOut(user.id);
      if (lockout.locked) {
        throw new Error(`Account temporarily locked. Try again in ${lockout.retryAfter} seconds.`);
      }

      const mfaToken = jwt.sign(
        { sub: user.id, type: 'mfa_pending' },
        getJWTSecret(),
        { expiresIn: '5m' }
      );
      return {
        requiresMFA: true,
        mfaToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, context);

    const { passwordHash, twoFactorSecret: _, ...userWithoutPassword } = user as any;
    return {
      requiresMFA: false,
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async verifyMFA(mfaToken: string, code: string, context?: { ipAddress?: string; userAgent?: string }) {
    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, getJWTSecret()) as any;
    } catch {
      throw new Error('MFA session expired. Please log in again.');
    }

    if (decoded.type !== 'mfa_pending') {
      throw new Error('Invalid MFA token.');
    }

    // Check lockout
    const lockout = isMFALockedOut(decoded.sub);
    if (lockout.locked) {
      throw new Error(`Too many failed attempts. Try again in ${lockout.retryAfter} seconds.`);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        organization: { include: { subscriptionPlanRef: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('User not found or 2FA not configured.');
    }

    const { verifyTOTPCode } = await import('../utils/totp.js');
    const isValid = await verifyTOTPCode(user.twoFactorSecret, code);

    if (!isValid) {
      const result = recordMFAFailure(user.id);
      if (result.locked) {
        throw new Error(`Too many failed attempts. Account locked for ${result.retryAfter} seconds.`);
      }
      const remaining = 5 - (result as any).attempts || 1;
      throw new Error(`Invalid MFA code. ${remaining} attempts remaining.`);
    }

    // Success — reset lockout
    resetMFAAttempts(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, context);

    const { passwordHash, twoFactorSecret: _secret, ...userWithoutPassword } = user as any;
    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async register(data: any, context?: { ipAddress?: string; userAgent?: string }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Password strength validation
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(data.password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(data.password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(data.password)) {
      throw new Error('Password must contain at least one number');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    let firstName = data.firstName;
    let lastName = data.lastName;

    let organizationId = data.organizationId;
    let roleName = data.role || 'WORKER';

    if (!organizationId) {
      const org = await prisma.organization.create({
        data: {
          name: data.organizationName || `${firstName}'s Organization`,
          email: data.email,
          slug: (data.organizationName || `${firstName}'s Organization`)
            .replace(/\s+/g, '-')
            .toLowerCase(),
        },
      });
      organizationId = org.id;
      roleName = 'ORGANIZATION_OWNER';
    }

    const role = await prisma.role.findFirst({
      where: { name: roleName, organizationId: null },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found in database. Please run the seed script first.`);
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: lastName || '',
        middleName: data.middleName || null,
        email: data.email,
        passwordHash,
        roleId: role.id,
        organizationId,
      },
      include: {
        role: true,
        organization: { include: { subscriptionPlanRef: true } },
      },
    });

    // Create email verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    // Send verification email (best-effort)
    try {
      const notifPort = process.env.NOTIFICATION_SERVICE_PORT || 4005;
      await fetch(`http://localhost:${notifPort}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          template: 'welcome',
          data: {
            firstName: user.firstName,
            verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
          },
        }),
      });
    } catch {
      // Best-effort — don't block registration
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, context);

    const { passwordHash: _, ...userWithoutPassword } = user as any;
    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async verifyEmail(token: string) {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification || verification.used || verification.expiresAt < new Date()) {
      throw new Error('Invalid or expired verification token');
    }

    if (verification.type !== 'EMAIL_VERIFICATION') {
      throw new Error('Invalid verification type');
    }

    // Mark token as used
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // Note: We don't have an emailVerified field on User yet
    // For now, just mark the token as used
    return { message: 'Email verified successfully' };
  }

  private generateAccessToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email ?? null,
      role: user.role.name,
      organizationId: user.organizationId,
      jti: generateJTI(),
    };
    return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN });
  }

  async generateRefreshToken(
    userId: string,
    options?: { ipAddress?: string; deviceInfo?: string }
  ): Promise<string> {
    const token = generateSecureToken(40);
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: options?.ipAddress || null,
        deviceInfo: options?.deviceInfo || null,
      },
    });

    return token;
  }

  async refreshToken(token: string, options?: { ipAddress?: string; deviceInfo?: string }) {
    const tokenHash = hashToken(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // ── IP Binding ──────────────────────────────────────
    // If we have a stored IP and a new IP, check for mismatch
    // (Allow first use without IP for backwards compatibility)
    if (storedToken.ipAddress && options?.ipAddress && storedToken.ipAddress !== options.ipAddress) {
      // IP mismatch — possible token theft. Revoke ALL user tokens.
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revoked: true },
      });
      throw new Error('Token used from new IP. All sessions revoked for security.');
    }

    // Revoke old token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const accessToken = this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(storedToken.user.id, options);

    // Link old token to new token for reuse detection
    const newTokenHash = hashToken(newRefreshToken);
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { replacedByToken: newTokenHash },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Detect refresh token reuse — if a revoked token is presented,
   * revoke ALL tokens for that user (security breach detected).
   */
  async detectRefreshTokenReuse(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && storedToken.revoked) {
      // Token reuse detected — revoke all user tokens
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revoked: true },
      });
      return true; // reused
    }

    return false;
  }

  async logout(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  async getActiveSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, tokenId: string) {
    return prisma.refreshToken.updateMany({
      where: { id: tokenId, userId },
      data: { revoked: true },
    });
  }
}
