import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const authController = new AuthController();

// Public auth flows: no token required.
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);

// `/me` requires an authenticated user.
router.get('/me', authMiddleware(), authController.me);

export default router;
