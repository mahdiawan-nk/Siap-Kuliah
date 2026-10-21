import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { authenticate } from '../middlewares/auth.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();
const authService = AuthService.getInstance();

// Rate limit login endpoint: 15 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Terlalu banyak percobaan login. Untuk alasan keamanan, tunggu 15 menit sebelum mencoba kembali.'
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const result = await authService.login(identifier, password, clientIp);

    // Set secure HttpOnly cookie
    res.cookie('siap_access_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      success: true,
      message: 'Login berhasil.',
      data: result,
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: err.message || 'Kredensial tidak valid.',
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('siap_access_token');
  res.json({
    success: true,
    message: 'Logout berhasil. Sesi telah diakhiri.',
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token wajib disertakan.' });
      return;
    }
    const result = await authService.refresh(refreshToken);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: err.message,
    });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export default router;
