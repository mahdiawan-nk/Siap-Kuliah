import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthUserPayload } from '../types/entities.js';

const JWT_SECRET = process.env.JWT_SECRET || 'siap-kuliah-secret-key-production-change-2026';
const QR_SECRET = process.env.QR_SECRET || 'siap-kuliah-qr-secret-key-2026';

export function signAccessToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateSecureRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function signQrTokenPayload(sessionId: string, timestamp: number, nonce: string): string {
  const data = `${sessionId}:${timestamp}:${nonce}`;
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
}

export function verifyQrTokenSignature(sessionId: string, timestamp: number, nonce: string, signature: string): boolean {
  const expected = signQrTokenPayload(sessionId, timestamp, nonce);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
