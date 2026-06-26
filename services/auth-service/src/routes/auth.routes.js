"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const express_2 = require("../../../../packages/auth/src/express/index");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
// Public auth flows: no token required.
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);
// `/me` requires an authenticated user.
router.get('/me', (0, express_2.authMiddleware)(), authController.me);
exports.default = router;
