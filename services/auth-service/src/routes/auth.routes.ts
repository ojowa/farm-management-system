import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const authController = new AuthController();

// Public auth flows: no token required.
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);

// Authenticated routes.
router.get('/me', authMiddleware(), authController.me);
router.get('/profile', authMiddleware(), authController.me);
router.put('/profile', authMiddleware(), authController.updateProfile);

// Multi-organization
router.get('/my-organizations', authMiddleware(), authController.myOrganizations);
router.post('/switch-organization', authMiddleware(), authController.switchOrganization);

export default router;
