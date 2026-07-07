import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  async login(data: any, ctx?: { ipAddress?: string; userAgent?: string }) {
    const user = await prisma.user.findUnique({ where: { email: data.email }, include: { role: true } });
    if (!user || !user.isActive) throw new Error('Invalid credentials');
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) throw new Error('Invalid credentials');
    if (user.twoFactorEnabled) {
      const mfaToken = jwt.sign({ sub: user.id, type: 'mfa' }, JWT_SECRET, { expiresIn: '5m' });
      return { requiresMFA: true, mfaToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
    }
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return { requiresMFA: false, user: userWithoutPassword, accessToken, refreshToken };
  }

  async verifyMFA(mfaToken: string, code: string, ctx?: { ipAddress?: string; userAgent?: string }) {
    const payload = jwt.verify(mfaToken, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user) throw new Error('User not found');
    // @ts-ignore - otplib types not available
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret! });
    if (!isValid) throw new Error('Invalid MFA code');
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async register(data: any, ctx?: { ipAddress?: string; userAgent?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email already registered');
    const passwordHash = await bcrypt.hash(data.password, 12);
    const defaultRole = await prisma.role.findFirst({ where: { name: 'WORKER', organizationId: null } });
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, roleId: defaultRole?.id || '', organizationId: data.organizationId || null },
      include: { role: true },
    });
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash: _, twoFactorSecret: __, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async verifyEmail(_token: string) {
    // Prisma User model doesn't have emailVerified field
    // This is a placeholder - email verification would need schema changes
  }

  async refreshToken(token: string, ctx?: { ipAddress?: string; deviceInfo?: string }) {
    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash, revoked: false } });
    if (!stored) throw new Error('Invalid refresh token');
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const user = await prisma.user.findUnique({ where: { id: stored.userId }, include: { role: true } });
    if (!user) throw new Error('User not found');
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    return { accessToken, refreshToken };
  }

  async detectRefreshTokenReuse(token: string) {
    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    return !!stored?.revoked;
  }

  async generateRefreshToken(userId: string, ctx?: { ipAddress?: string; deviceInfo?: string }) {
    const rawToken = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const tokenHash = hashToken(rawToken);
    await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), ipAddress: ctx?.ipAddress, deviceInfo: ctx?.deviceInfo } });
    return rawToken;
  }

  generateAccessToken(user: any) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role?.name, organizationId: user.organizationId }, JWT_SECRET, { expiresIn: '15m' });
  }

  async logout(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async logoutAllSessions(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getActiveSessions(userId: string) {
    return prisma.refreshToken.findMany({ where: { userId, revoked: false }, select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
  }

  async revokeSession(userId: string, tokenId: string) {
    await prisma.refreshToken.updateMany({ where: { id: tokenId, userId }, data: { revoked: true } });
  }
}
