import { Router, Request, Response } from 'express';
import { prisma } from '@farm/database';
import { authMiddleware } from '@farm/auth/express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

function generateApiKey(): string {
  return `fm_${crypto.randomBytes(24).toString('hex')}`;
}

// GET /api-keys - List user's API keys
router.get('/', authMiddleware(), async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.sub) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.sub },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        service: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api-keys - Create a new API key
router.post('/', authMiddleware(), async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.sub) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    const { name, service } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    const rawKey = generateApiKey();
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.sub,
        name: name.trim(),
        keyPrefix,
        keyHash,
        service: service || 'other',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        service: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ ...apiKey, key: rawKey });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api-keys/:id/toggle - Toggle API key active state
router.patch('/:id/toggle', authMiddleware(), async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.sub) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: String(req.params.id), userId: user.sub },
    });
    if (!key) return res.status(404).json({ message: 'API key not found' });

    const updated = await prisma.apiKey.update({
      where: { id: key.id },
      data: { isActive: !key.isActive },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        service: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api-keys/:id - Delete an API key
router.delete('/:id', authMiddleware(), async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.sub) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: String(req.params.id), userId: user.sub },
    });
    if (!key) return res.status(404).json({ message: 'API key not found' });

    await prisma.apiKey.delete({ where: { id: key.id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
