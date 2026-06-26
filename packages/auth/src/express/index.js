"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.requireAuth = exports.authMiddleware = void 0;
const jwt_1 = require("../jwt");
const roles_1 = require("../roles");
const sendAuthError = (res, err) => {
    const status = err instanceof jwt_1.AuthError ? err.statusCode : 401;
    const message = err instanceof Error ? err.message : 'Authentication failed';
    res.status(status).json({ statusCode: status, message });
};
/**
 * Express middleware that verifies the bearer token and optionally enforces
 * a role or permission. Place it on individual routes or whole routers via
 * `router.use(authMiddleware({ ... }))`.
 */
const authMiddleware = (options = {}) => {
    return (req, res, next) => {
        const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
        if (!token) {
            return sendAuthError(res, new jwt_1.AuthError(401, 'Authentication required'));
        }
        let user;
        try {
            user = (0, jwt_1.verifyAccessToken)(token);
        }
        catch (err) {
            return sendAuthError(res, new jwt_1.AuthError(401, 'Invalid or expired token'));
        }
        if (options.roles && options.roles.length > 0 && !(0, roles_1.userHasAnyRole)(user.role, options.roles)) {
            return sendAuthError(res, new jwt_1.AuthError(403, 'Insufficient role'));
        }
        if (options.permission && !(0, roles_1.roleHasPermission)(user.role, options.permission)) {
            return sendAuthError(res, new jwt_1.AuthError(403, 'Insufficient permission'));
        }
        req.user = user;
        return next();
    };
};
exports.authMiddleware = authMiddleware;
/**
 * Convenience: require an authenticated user, no role or permission checks.
 */
exports.requireAuth = (0, exports.authMiddleware)();
/**
 * Wrap async controller handlers so thrown errors propagate to the Express
 * error pipeline instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
