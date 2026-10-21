import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const hitMap = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}_${req.baseUrl}${req.path}`;
    const now = Date.now();
    const record = hitMap.get(key);

    if (!record || now > record.resetAt) {
      hitMap.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > max) {
      res.status(429).json({
        success: false,
        message: message || 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.',
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}
