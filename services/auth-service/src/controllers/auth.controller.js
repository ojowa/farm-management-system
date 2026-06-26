"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const validation_1 = require("@farm/validation");
const authService = new auth_service_1.AuthService();
class AuthController {
    async login(req, res) {
        try {
            const validatedData = validation_1.loginSchema.parse(req.body);
            const result = await authService.login(validatedData);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ message: error.message });
        }
    }
    async register(req, res) {
        try {
            const validatedData = validation_1.registerSchema.parse(req.body);
            const result = await authService.register(validatedData);
            res.status(201).json(result);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ message: 'Refresh token required' });
            }
            const result = await authService.refreshToken(refreshToken);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ message: error.message });
        }
    }
    async me(req, res) {
        // `req.user` is populated by `authMiddleware` after the JWT is verified.
        const user = req.user;
        if (!user || !user.sub) {
            return res.status(401).json({ message: 'Unauthenticated' });
        }
        res.json({
            id: user.sub,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        });
    }
}
exports.AuthController = AuthController;
