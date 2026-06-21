import { prisma } from '@farm/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { LoginCredentials } from '@farm/types';

export class AuthService {
  async login(credentials: LoginCredentials) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: { 
        organization: true,
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

    let organizationId = data.organizationId;
    let roleName = data.role || 'WORKER';

    if (!organizationId) {
      const org = await prisma.organization.create({
        data: {
          name: data.organizationName || `${data.firstName}'s Organization`,
          email: data.email
        }
      });
      organizationId = org.id;
      roleName = 'ORGANIZATION_OWNER'; // First user is owner
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        roleId: role.id,
        organizationId
      },
      include: {
        role: true,
        organization: true
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

  private generateAccessToken(user: any) {
    return jwt.sign(
      { 
        sub: user.id, 
        email: user.email, 
        role: user.role.name,
        organizationId: user.organizationId 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );
  }

  private async generateRefreshToken(userId: string) {
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
}
