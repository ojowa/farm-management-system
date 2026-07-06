import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

function cleanup(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message, keyGenerator } = options;
  const storeName = `rl_${windowMs}_${max}`;
  const store = getStore(storeName);

  // Periodic cleanup every 60s
  const interval = setInterval(() => cleanup(store), 60_000);
  if (interval.unref) interval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const entry = store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          statusCode: 429,
          message: message || 'Too many requests. Please try again later.',
          retryAfter,
        });
        return;
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + windowMs });
    }

    const current = store.get(key)!;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetAt / 1000));

    next();
  };
}

/** 5 attempts per 15 minutes for login */
export const loginRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `login:${email}:${ip}`;
  },
});

/** 3 attempts per 15 minutes for password reset */
export const passwordResetRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts. Please try again later.',
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `pwd_reset:${email}`;
  },
});

/** 10 attempts per 5 minutes for MFA verify */
export const mfaRateLimit = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many MFA attempts. Please try again in 5 minutes.',
  keyGenerator: (req) => {
    const userId = req.body?.userId || (req as any).user?.sub || 'unknown';
    return `mfa:${userId}`;
  },
});

/** 30 requests per minute for refresh token */
export const refreshRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many refresh requests.',
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `refresh:${ip}`;
  },
});
