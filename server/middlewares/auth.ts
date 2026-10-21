import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/crypto.js';
import { AuthUserPayload } from '../types/entities.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check HttpOnly cookie
  if (!token && req.cookies && req.cookies.siap_access_token) {
    token = req.cookies.siap_access_token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login kembali.',
    });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'Sesi login telah kedaluwarsa atau tidak valid.',
    });
    return;
  }

  req.user = payload;
  next();
}
