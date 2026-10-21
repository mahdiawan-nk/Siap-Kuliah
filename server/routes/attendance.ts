import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { StorageManager } from '../storage/StorageManager.js';
import { AttendanceCorrectionRequest, AttendanceRecord } from '../types/entities.js';

const router = Router();
const attendanceService = AttendanceService.getInstance();

// Rate limiter for scan endpoint: max 30 scans per minute per client
const scanLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Terlalu banyak permintaan scan presensi. Tunggu beberapa detik.'
});

router.use(authenticate);

// POST /api/v1/attendance/scan
router.post('/scan', scanLimiter, requirePermission('attendance.scan'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, token } = req.body;
    if (!sessionId || !token) {
      res.status(400).json({ success: false, message: 'ID Sesi dan Token QR wajib disertakan.' });
      return;
    }

    const result = await attendanceService.scanQr(sessionId, token, req.user!);
    res.json({
      success: true,
      message: `Presensi berhasil dicatat dengan status: ${result.status}`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Presensi gagal.',
    });
  }
});

// GET /api/v1/attendance/my-history
router.get('/my-history', requirePermission('attendance.read_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const history = await attendanceService.getStudentAttendanceHistory(req.user!);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance-records/:id/corrections
router.post('/records/:id/corrections', requirePermission('attendance.correct_own_scope'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { newStatus, reason } = req.body;
    if (!newStatus || !reason) {
      res.status(400).json({ success: false, message: 'Status baru dan alasan koreksi wajib disertakan.' });
      return;
    }

    const record = await attendanceService.correctRecord(req.params.id, newStatus, reason, req.user!);
    res.json({
      success: true,
      message: 'Status kehadiran berhasil dikoreksi dan tercatat pada audit trail.',
      data: record,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// POST /api/v1/attendance/records/:id/appeal
router.post('/records/:id/appeal', requirePermission('attendance.read_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { requestedStatus, reason } = req.body;
    const appeal = await attendanceService.requestCorrection(req.params.id, requestedStatus, reason, req.user!);
    res.json({
      success: true,
      message: 'Permohonan koreksi presensi berhasil diajukan.',
      data: appeal,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/v1/attendance/correction-logs
router.get('/correction-logs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const logs = await storage.getAll<any>('attendance_correction_logs');
    const users = await storage.getAll<any>('users');

    const enriched = logs.map((log: any) => {
      const changer = users.find((u: any) => u.id === log.changedBy);
      return {
        ...log,
        changedByName: changer?.username || log.changedBy,
      };
    });

    res.json({ success: true, data: enriched.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance/correction-requests
router.get('/correction-requests', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const requests = await storage.getAll<AttendanceCorrectionRequest>('attendance_correction_requests');
    const users = await storage.getAll<any>('users');

    const enriched = requests.map(r => {
      const student = users.find((u: any) => u.id === r.studentUserId);
      return {
        ...r,
        studentUsername: student?.username || '-',
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance/correction-requests/:id/review
router.post('/correction-requests/:id/review', requirePermission('attendance.correct_own_scope'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { decision, reviewNotes } = req.body; // 'APPROVED' or 'REJECTED'
    const storage = StorageManager.getInstance().getStorage();
    const appeal = await storage.getById<AttendanceCorrectionRequest>('attendance_correction_requests', req.params.id);

    if (!appeal) {
      res.status(404).json({ success: false, message: 'Permohonan koreksi tidak ditemukan.' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await storage.update<AttendanceCorrectionRequest>('attendance_correction_requests', appeal.id, {
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      reviewedBy: req.user!.userId,
      reviewedAt: now,
      reviewNotes: reviewNotes || (decision === 'APPROVED' ? 'Disetujui oleh dosen' : 'Ditolak'),
    });

    // If approved, update attendance record status
    if (decision === 'APPROVED') {
      await attendanceService.correctRecord(
        appeal.attendanceRecordId,
        appeal.requestedStatus as any,
        `Persetujuan permohonan koreksi mahasiswa: ${appeal.reason}`,
        req.user!
      );
    }

    res.json({
      success: true,
      message: `Permohonan telah di-${decision.toLowerCase()}.`,
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
