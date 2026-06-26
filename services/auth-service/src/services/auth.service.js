"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_1 = require("@farm/database");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m');
class AuthService {
    async login(credentials) {
        const user = await database_1.prisma.user.findUnique({
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
        const isPasswordValid = await bcrypt_1.default.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        // Update last login
        await database_1.prisma.user.update({
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
    async register(data) {
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: data.email }
        });
        if (existingUser) {
            throw new Error('User already exists');
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 12);
        let organizationId = data.organizationId;
        let roleName = data.role || 'WORKER';
        if (!organizationId) {
            const org = await database_1.prisma.organization.create({
                data: {
                    name: data.organizationName || `${data.firstName}'s Organization`,
                    email: data.email
                }
            });
            organizationId = org.id;
            roleName = 'ORGANIZATION_OWNER'; // First user is owner
        }
        const role = await database_1.prisma.role.findUnique({
            where: { name: roleName }
        });
        if (!role) {
            throw new Error(`Role ${roleName} not found`);
        }
        const user = await database_1.prisma.user.create({
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
    /**
     * Sign an access token with the canonical Farm Management payload. Every
     * downstream service relies on this shape via `@farm/auth`'s `verifyAccessToken`.
     */
    generateAccessToken(user) {
        const payload = {
            sub: user.id,
            email: user.email ?? null,
            role: user.role.name,
            organizationId: user.organizationId,
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    async generateRefreshToken(userId) {
        const token = crypto_1.default.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        await database_1.prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });
        return token;
    }
    async refreshToken(token) {
        const storedToken = await database_1.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: { include: { role: true } } }
        });
        if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
            throw new Error('Invalid refresh token');
        }
        // Revoke old token (Rotation)
        await database_1.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true }
        });
        const accessToken = this.generateAccessToken(storedToken.user);
        const newRefreshToken = await this.generateRefreshToken(storedToken.user.id);
        return { accessToken, refreshToken: newRefreshToken };
    }
}
exports.AuthService = AuthService;
