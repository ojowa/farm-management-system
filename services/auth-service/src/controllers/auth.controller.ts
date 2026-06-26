import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema } from '@farm/validation';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token required' });
      }
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async me(req: Request, res: Response) {
    // `req.user` is populated by `authMiddleware` after the JWT is verified.
    const user = (req as any).user;
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
