import { prisma } from '@farm/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { LoginCredentials } from '@farm/types';

// Lazy evaluation: process.env.JWT_SECRET is not set when this module is first
// loaded because dotenv.config() runs in main.ts *after* all require() calls.
const getJWTSecret = () => process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];

export class AuthService {
  async login(credentials: LoginCredentials) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        organization: {
          include: {
            subscriptionPlanRef: true
          }
        },
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword
    };
  }

  async register(data: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists');
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
          slug: (data.organizationName || `${firstName}'s Organization`).replace(/\s+/g, '-').toLowerCase()
        }
      });
      organizationId = org.id;
      roleName = 'ORGANIZATION_OWNER'; // First user is owner
    }

    const role = await prisma.role.findFirst({
      where: { name: roleName, organizationId: null }
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
        organizationId
      },
      include: {
        role: true,
        organization: {
          include: {
            subscriptionPlanRef: true
          }
        }
      }
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword
    };
  }

  /**
   * Sign an access token with the canonical Farm Management payload. Every
   * downstream service relies on this shape via `@farm/auth`'s `verifyAccessToken`.
   */
  private generateAccessToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email ?? null,
      role: user.role.name,
      organizationId: user.organizationId,
    };
    return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });

    return token;
  }

  async refreshToken(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { role: true } } }
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true }
    });

    const accessToken = this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(storedToken.user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
