import { StorageManager } from '../storage/StorageManager.js';
import { AttendanceSession, AttendanceQrToken } from '../types/entities.js';
import { generateSecureRandomToken, hashString, signQrTokenPayload, verifyQrTokenSignature } from '../utils/crypto.js';

export interface GeneratedQrResult {
  sessionId: string;
  tokenPlain: string;
  issuedAt: string;
  expiresAt: string;
  intervalSeconds: number;
  secondsRemaining: number;
}

export class QrService {
  private static instance: QrService;
  // Network grace period (ms) to account for clock skew and transit latency
  private readonly NETWORK_GRACE_PERIOD_MS = 4000;

  private constructor() {}

  public static getInstance(): QrService {
    if (!QrService.instance) {
      QrService.instance = new QrService();
    }
    return QrService.instance;
  }

  public async getOrGenerateActiveToken(sessionId: string, forceNew = false): Promise<GeneratedQrResult> {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);

    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    if (session.status !== 'OPEN') {
      throw new Error(`Sesi perkuliahan berstatus ${session.status}. QR hanya dapat diakses saat sesi OPEN.`);
    }

    const now = Date.now();
    const intervalSec = Math.max(5, Math.min(60, session.qrIntervalSeconds || 5));

    // Check if an existing unexpired token exists
    if (!forceNew) {
      const activeTokens = await storage.find<AttendanceQrToken>('attendance_qr_tokens', t => 
        t.sessionId === sessionId &&
        !t.revokedAt &&
        new Date(t.expiresAt).getTime() > (now + 1000)
      );

      if (activeTokens.length > 0) {
        // Return active token info (reconstructed plain format is cached or re-issued)
        const currentToken = activeTokens[activeTokens.length - 1];
        const expiryTime = new Date(currentToken.expiresAt).getTime();
        const secondsRemaining = Math.max(1, Math.round((expiryTime - now) / 1000));
        
        // If it still has plain token saved in memory or issued recently
        if (currentToken.tokenPlain) {
          return {
            sessionId,
            tokenPlain: currentToken.tokenPlain,
            issuedAt: currentToken.issuedAt,
            expiresAt: currentToken.expiresAt,
            intervalSeconds: intervalSec,
            secondsRemaining,
          };
        }
      }
    }

    // Revoke older tokens for this session
    const oldTokens = await storage.find<AttendanceQrToken>('attendance_qr_tokens', t => 
      t.sessionId === sessionId && !t.revokedAt
    );
    for (const old of oldTokens) {
      await storage.update<AttendanceQrToken>('attendance_qr_tokens', old.id, { revokedAt: new Date(now).toISOString() });
    }

    // Issue brand-new cryptographic token
    const timestamp = now;
    const nonce = generateSecureRandomToken(16);
    const signature = signQrTokenPayload(sessionId, timestamp, nonce);
    const tokenPlain = `SIAP:${sessionId}:${timestamp}:${nonce}:${signature}`;
    const tokenHash = hashString(tokenPlain);

    const expiresAt = new Date(now + intervalSec * 1000).toISOString();
    const issuedAt = new Date(now).toISOString();

    const createdToken = await storage.create<AttendanceQrToken>('attendance_qr_tokens', {
      sessionId,
      tokenHash,
      tokenPlain, // kept on server during active cycle
      issuedAt,
      expiresAt,
      revokedAt: null,
      createdAt: issuedAt,
    });

    return {
      sessionId,
      tokenPlain,
      issuedAt,
      expiresAt,
      intervalSeconds: intervalSec,
      secondsRemaining: intervalSec,
    };
  }

  public async verifyToken(tokenPlain: string, targetSessionId: string): Promise<{ valid: boolean; reason?: string }> {
    const storage = StorageManager.getInstance().getStorage();
    if (!tokenPlain || !tokenPlain.startsWith('SIAP:')) {
      return { valid: false, reason: 'Format QR Token tidak dikenali atau korup.' };
    }

    const parts = tokenPlain.split(':');
    if (parts.length !== 5) {
      return { valid: false, reason: 'Struktur segmen QR Token tidak valid.' };
    }

    const [, sessionId, timestampStr, nonce, signature] = parts;

    if (sessionId !== targetSessionId) {
      return { valid: false, reason: 'QR Code ini bukan untuk sesi perkuliahan ini.' };
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return { valid: false, reason: 'Timestamp QR Token tidak valid.' };
    }

    // Verify HMAC cryptographic signature
    try {
      const isSignatureValid = verifyQrTokenSignature(sessionId, timestamp, nonce, signature);
      if (!isSignatureValid) {
        return { valid: false, reason: 'Tanda tangan digital QR Token tidak valid atau dimanipulasi.' };
      }
    } catch {
      return { valid: false, reason: 'Verifikasi kriptografi token gagal.' };
    }

    // Check token hash in database/storage
    const tokenHash = hashString(tokenPlain);
    const storedToken = await storage.findOne<AttendanceQrToken>('attendance_qr_tokens', t => 
      t.sessionId === sessionId && t.tokenHash === tokenHash
    );

    if (!storedToken) {
      return { valid: false, reason: 'Token QR tidak terdaftar pada sesi ini.' };
    }

    if (storedToken.revokedAt) {
      return { valid: false, reason: 'Token QR ini telah dicabut atau digantikan oleh token baru.' };
    }

    // Verify expiration with network grace period
    const now = Date.now();
    const expiryTime = new Date(storedToken.expiresAt).getTime();

    if (now > expiryTime + this.NETWORK_GRACE_PERIOD_MS) {
      return { valid: false, reason: 'Token QR telah kedaluwarsa. Silakan scan QR terbaru yang tampil di layar.' };
    }

    return { valid: true };
  }
}
