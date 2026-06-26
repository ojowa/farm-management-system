"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = exports.extractBearerToken = exports.verifyAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Work around typings mismatch in this repo's `jsonwebtoken`/`@types/jsonwebtoken`.
// We only rely on runtime behavior of `jwt.verify`.
const verify = jsonwebtoken_1.default.verify;
const DEFAULT_SECRET = 'secret';
const resolveSecret = () => process.env.JWT_SECRET || DEFAULT_SECRET;
/**
 * Verify a bearer token and return a normalized user object. Throws on any
 * verification failure (missing, expired, malformed, wrong signature).
 */
const verifyAccessToken = (token) => {
    // jsonwebtoken typings vary by version; keep runtime typing explicit.
    const decoded = verify(token, resolveSecret());
    if (!decoded || !decoded.sub || !decoded.role || !decoded.organizationId) {
        throw new Error('Invalid token payload');
    }
    return {
        id: decoded.sub,
        email: decoded.email ?? null,
        role: decoded.role,
        organizationId: decoded.organizationId,
    };
};
exports.verifyAccessToken = verifyAccessToken;
const extractBearerToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [scheme, token] = authorization.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
        return null;
    }
    return token;
};
exports.extractBearerToken = extractBearerToken;
/**
 * Throws a JSON-friendly Error used by both Express middleware and NestJS
 * guards. Services translate these into 401/403 responses via their existing
 * error handling (the API gateway exception filter, the auth middleware).
 */
class AuthError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
