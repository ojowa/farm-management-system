import { Inject,  Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { RoleRepository } from '../../domain/repositories/role.repository';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
const ACCESS_TOKEN_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY || '7d') as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_DB_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_DB_EXPIRY_MS) || 7 * 24 * 60 * 60 * 1000;
const MFA_TOKEN_EXPIRY = (process.env.MFA_TOKEN_EXPIRY || '5m') as jwt.SignOptions['expiresIn'];
const APP_NAME = process.env.APP_NAME || 'FarmManagement';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is required');
  return secret;
}

function getMfaSecret(): string {
  const secret = process.env.MFA_SECRET;
  if (!secret) throw new Error('MFA_SECRET environment variable is required');
  return secret;
}

@Injectable()
export class AuthService {
  constructor(@Inject('UserRepository') private readonly userRepo: UserRepository, @Inject('RefreshTokenRepository') private readonly refreshTokenRepo: RefreshTokenRepository, @Inject('RoleRepository') private readonly roleRepo: RoleRepository, 
  ) {}

  async login(data: { email: string; password: string },  ctx?: { ipAddress?: string; userAgent?: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (user.twoFactorEnabled) {
      const mfaToken = jwt.sign({ sub: user.id, type: 'mfa' }, getMfaSecret(), { expiresIn: MFA_TOKEN_EXPIRY });
      return { requiresMFA: true, mfaToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
    }
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return { requiresMFA: false, user: userWithoutPassword, accessToken, refreshToken };
  }

  async verifyMFA(mfaToken: string, code: string, ctx?: { ipAddress?: string; userAgent?: string }) {
    const payload = jwt.verify(mfaToken, getMfaSecret(), { algorithms: ['HS256'] }) as any;
    const user = await this.userRepo.findById(payload.sub);
    if (!user) throw new NotFoundException('User not found');
    // @ts-ignore - otplib types not available
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret! });
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationId?: string }, ctx?: { ipAddress?: string; userAgent?: string }) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
    const defaultRole = await this.roleRepo.findDefaultRole();
    const user = await this.userRepo.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: defaultRole?.id || '',
      organizationId: data.organizationId,
    });
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash: _, twoFactorSecret: __, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async registerConsole(data: { email: string; password: string; firstName: string; middleName?: string; lastName: string }, ctx?: { ipAddress?: string; userAgent?: string }) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    const superAdminRole = await this.roleRepo.findByName('SUPER_ADMIN', null);
    if (!superAdminRole) throw new BadRequestException('SUPER_ADMIN role not found — run seed first');

    const user = await this.userRepo.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      roleId: superAdminRole.id,
    });

    const { passwordHash: _, twoFactorSecret: __, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword };
  }

  async refreshToken(token: string, ctx?: { ipAddress?: string; deviceInfo?: string }) {
    if (!token) throw new UnauthorizedException('Refresh token is required');
    const tokenHash = hashToken(token);
    const stored = await this.refreshTokenRepo.findValidByHash(tokenHash);
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.userRepo.findById(stored.userId);
    if (!user) throw new NotFoundException('User not found');
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    // Revoke old token and record which new token replaced it
    const newTokenHash = hashToken(refreshToken);
    await this.refreshTokenRepo.revoke(stored.id, newTokenHash);
    return { accessToken, refreshToken };
  }

  async detectRefreshTokenReuse(token: string) {
    const tokenHash = hashToken(token);
    const stored = await this.refreshTokenRepo.findValidByHash(tokenHash);
    return !!stored?.revoked;
  }

  async generateRefreshToken(userId: string, ctx?: { ipAddress?: string; deviceInfo?: string }) {
    const rawToken = jwt.sign({ sub: userId }, getJwtRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
    const tokenHash = hashToken(rawToken);
    await this.refreshTokenRepo.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DB_EXPIRY_MS),
      ipAddress: ctx?.ipAddress,
      deviceInfo: ctx?.deviceInfo,
    });
    return rawToken;
  }

  async generateAccessToken(user: any) {
    let permissions: string[] = [];
    if (user.roleId) {
      permissions = await this.roleRepo.getPermissionsForRole(user.roleId);
    }
    const secret = getJwtSecret();
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role?.name || user.roleName, permissions, organizationId: user.organizationId },
      secret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    return token;
  }

  async logout(userId: string) {
    await this.refreshTokenRepo.deleteAllForUser(userId);
  }

  async logoutAllSessions(userId: string) {
    await this.refreshTokenRepo.deleteAllForUser(userId);
  }

  async getActiveSessions(userId: string) {
    return this.refreshTokenRepo.findActiveByUser(userId);
  }

  async revokeSession(userId: string, tokenId: string) {
    await this.refreshTokenRepo.revoke(tokenId);
  }

  async getProfile(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('User ID is missing from token');
    }
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new NotFoundException('User not found');
      const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (err) {
      throw err;
    }
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string; phone?: string; avatar?: string }) {
    const user = await this.userRepo.update(userId, data);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepo.update(userId, { passwordHash } as any);
    await this.refreshTokenRepo.deleteAllForUser(userId);
  }

  async getNotificationPreferences(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user.notificationPreferences || {};
  }

  async updateNotificationPreferences(userId: string, preferences: any) {
    const user = await this.userRepo.update(userId, { notificationPreferences: preferences } as any);
    return user.notificationPreferences;
  }

  async enable2fa(userId: string) {
    // @ts-ignore
    const { authenticator } = await import('otplib');
    const secret = authenticator.generateSecret();
    await this.userRepo.update(userId, { twoFactorSecret: secret } as any);
    return { secret, otpauthUrl: authenticator.keyuri(userId, APP_NAME, secret) };
  }

  async confirm2fa(userId: string, code: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.twoFactorSecret) throw new BadRequestException('2FA not initialized');
    // @ts-ignore
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) throw new UnauthorizedException('Invalid 2FA code');
    await this.userRepo.update(userId, { twoFactorEnabled: true } as any);
  }

  async disable2fa(userId: string, code: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.twoFactorSecret) throw new BadRequestException('2FA is not enabled');
    // @ts-ignore - otplib types not available
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) throw new UnauthorizedException('Invalid 2FA code — cannot disable without verification');
    await this.userRepo.update(userId, { twoFactorEnabled: false, twoFactorSecret: null } as any);
  }
}
