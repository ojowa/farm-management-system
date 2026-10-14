import { Inject,  Injectable, UnauthorizedException, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

/** The authenticated caller as embedded in the JWT (see generateAccessToken). */
interface AuthCaller {
  id?: string;
  sub?: string;
  role?: string;
  permissions?: string[];
  organizationId?: string | null;
}
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
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationId?: string }, ctx?: { ipAddress?: string; userAgent?: string }) {
    const email = data.email?.trim();
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!email || !firstName || !lastName) throw new BadRequestException('email, firstName and lastName are required');
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const defaultRole = await this.roleRepo.findDefaultRole();
    if (!defaultRole) throw new BadRequestException('No default role configured — run seed first');
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
    const user = await this.userRepo.create({
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: defaultRole.id,
      organizationId: data.organizationId,
    });
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id, ctx);
    const { passwordHash: _, twoFactorSecret: __, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refreshToken(token: string, ctx?: { ipAddress?: string; deviceInfo?: string }) {
    if (!token) throw new UnauthorizedException('Refresh token is required');
    const tokenHash = hashToken(token);
    const stored = await this.refreshTokenRepo.findValidByHash(tokenHash);
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.userRepo.findById(stored.userId);
    if (!user) throw new NotFoundException('User not found');
    const accessToken = await this.generateAccessToken(user);
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
      const { prisma } = await import('../../../../kernel/database');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        // Web clients derive the UI permission set from
        // `user.role.permissions[].permission.name`.
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });
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

  /**
   * Single-organization model: an account belongs to at most one organization
   * through `User.organizationId`. (The `UserOrganization` membership table
   * this used to read is never written — every call fell through to the same
   * one-org fallback anyway.)
   */
  async getMyOrganizations(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.organizationId) return [];

    const { prisma } = await import('../../../../kernel/database');
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    return org ? [{ organization: org, isDefault: true }] : [];
  }

  /**
   * The role flag behind `PlatformAdminGuard`, read fresh from the DB so the
   * organization popup never trusts whatever a JWT happened to carry.
   */
  private async isPlatformAdminRole(roleId?: string | null): Promise<boolean> {
    if (!roleId) return false;
    const { prisma } = await import('../../../../kernel/database');
    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isPlatformAdmin: true } });
    return !!role?.isPlatformAdmin;
  }

  /**
   * Id+name list behind the admin app's organization popup. Platform admins
   * only (DB role flag) — organization staff never see the popup and would
   * never call this, and the payload deliberately carries nothing beyond the
   * two fields the picker renders.
   */
  async listPlatformOrganizations(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!(await this.isPlatformAdminRole(user.roleId))) throw new ForbiddenException('Platform administrators only');

    const { prisma } = await import('../../../../kernel/database');
    return prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Re-issues tokens for the caller's organization. Self-service switching to
   * a *different* organization is rejected on purpose: with one organization
   * per account, moving someone is a platform-admin action — otherwise any
   * signed-in user could join any organization simply by naming its id.
   * Platform admins are the exception: the admin app's organization popup
   * lets them enter any existing organization, and the choice is persisted to
   * their account row so org-scoped reads and stamped writes line up with the
   * issued token.
   */
  async switchOrganization(userId: string, organizationId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!organizationId) throw new BadRequestException('organizationId is required');

    if (user.organizationId !== organizationId) {
      if (!(await this.isPlatformAdminRole(user.roleId))) {
        throw new ForbiddenException('Your account belongs to a single organization. A platform administrator can move you.');
      }
      const { prisma } = await import('../../../../kernel/database');
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const updated = await this.userRepo.update(userId, { organizationId } as any);
    const accessToken = await this.generateAccessToken(updated);
    const refreshToken = await this.generateRefreshToken(userId);

    const { passwordHash, twoFactorSecret, ...userWithoutPassword } = updated as any;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  /**
   * User management is organization-scoped: an organization's managers see and
   * manage only their own users. Platform admins (wildcard permission) see
   * everyone, including accounts that are not attached to any organization —
   * those stay invisible to every organization.
   */
  async listAllUsers(caller?: AuthCaller) {
    const { prisma } = await import('../../../../kernel/database');
    return prisma.user.findMany({
      where: this.userManagementScope(caller),
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        isActive: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Platform admins see every user; everyone else only their own organization. */
  private isPlatformAdmin(caller?: AuthCaller): boolean {
    return !!caller?.permissions?.includes('*');
  }

  private userManagementScope(caller?: AuthCaller) {
    if (this.isPlatformAdmin(caller)) return undefined;
    if (caller?.organizationId) return { organizationId: caller.organizationId };
    // No organization and not platform-scoped: only the caller's own account.
    return { id: caller?.id ?? caller?.sub ?? '__no-users__' };
  }

  /** Guards cross-tenant writes: non-platform callers may only touch users in their own organization. */
  private async assertUserInScope(caller: AuthCaller | undefined, targetUserId: string) {
    if (this.isPlatformAdmin(caller)) return;
    const { prisma } = await import('../../../../kernel/database');
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (!caller?.organizationId || target.organizationId !== caller.organizationId) {
      throw new ForbiddenException('You can only manage users in your own organization');
    }
  }

  async updateUser(userId: string, data: { firstName?: string; lastName?: string; isActive?: boolean; organizationId?: string }, caller?: AuthCaller) {
    await this.assertUserInScope(caller, userId);
    // Moving a user between organizations is a platform-admin action.
    if (!this.isPlatformAdmin(caller)) delete (data as any).organizationId;
    const { prisma } = await import('../../../../kernel/database');
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
        role: true,
      },
    });
    return user;
  }

  async toggleUserActive(userId: string, caller?: AuthCaller) {
    await this.assertUserInScope(caller, userId);
    const { prisma } = await import('../../../../kernel/database');
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !existing.isActive },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        organizationId: true,
        role: true,
      },
    });

    // A deactivated account must not keep using live sessions.
    if (!user.isActive) {
      try {
        await this.logoutAllSessions(userId);
      } catch {
        // Session revocation is best-effort — the guard already rejects
        // deactivated users on the next token verification.
      }
    }

    return user;
  }
}
