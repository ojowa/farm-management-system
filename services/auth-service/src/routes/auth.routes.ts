import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '@farm/auth/express';
import { loginRateLimit, mfaRateLimit, refreshRateLimit } from '../middleware/rateLimit';

const router = Router();
const authController = new AuthController();

// ── Public auth flows (rate limited) ──────────────────────
router.post('/login', loginRateLimit, authController.login);
router.post('/verify-mfa', mfaRateLimit, authController.verifyMFA);
router.post('/register', authController.register);
router.post('/refresh', refreshRateLimit, authController.refresh);
router.get('/verify-email', authController.verifyEmail);

// ── Authenticated routes ──────────────────────────────────
router.get('/me', authMiddleware(), authController.me);
router.get('/profile', authMiddleware(), authController.me);
router.put('/profile', authMiddleware(), authController.updateProfile);
router.put('/password', authMiddleware(), authController.changePassword);
router.get('/preferences', authMiddleware(), authController.getPreferences);
router.put('/preferences', authMiddleware(), authController.updatePreferences);
router.post('/logout', authMiddleware(), authController.logout);

// ── Multi-organization ────────────────────────────────────
router.get('/my-organizations', authMiddleware(), authController.myOrganizations);
router.post('/switch-organization', authMiddleware(), authController.switchOrganization);

// ── 2FA Management ────────────────────────────────────────
router.post('/2fa/generate', authMiddleware(), authController.generate2FASecret);
router.post('/2fa/enable', authMiddleware(), authController.enable2FAEndpoint);
router.post('/2fa/disable', authMiddleware(), authController.disable2FAEndpoint);

// ── Session Management ────────────────────────────────────
router.get('/sessions', authMiddleware(), authController.getSessions);
router.delete('/sessions/:tokenId', authMiddleware(), authController.revokeSession);
router.delete('/sessions', authMiddleware(), authController.revokeAllSessions);

export default router;
