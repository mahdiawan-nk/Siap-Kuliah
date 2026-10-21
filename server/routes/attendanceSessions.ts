import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { SessionService } from '../services/SessionService.js';
import { QrService } from '../services/QrService.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { StorageManager } from '../storage/StorageManager.js';
import QRCode from 'qrcode';

const router = Router();
const sessionService = SessionService.getInstance();
const qrService = QrService.getInstance();
const attendanceService = AttendanceService.getInstance();

// Apply auth to all session endpoints
router.use(authenticate);

// GET /api/v1/attendance-sessions
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      classId: req.query.classId as string,
      status: req.query.status as any,
      studyProgramId: req.query.studyProgramId as string,
    };
    const sessions = await sessionService.listSessions(filters, req.user!);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance-sessions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<any>('attendance_sessions', req.params.id);
    if (!session) {
      res.status(404).json({ success: false, message: 'Sesi perkuliahan tidak ditemukan.' });
      return;
    }
    const cls = await storage.getById<any>('classes', session.classId);
    const course = cls ? await storage.getById<any>('courses', cls.courseId) : null;
    const realization = await storage.findOne<any>('lecture_realizations', r => r.sessionId === session.id);

    res.json({
      success: true,
      data: {
        ...session,
        classCode: cls?.code || '',
        courseName: course?.name || '',
        courseCode: course?.code || '',
        realization,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance-sessions
router.post('/', requirePermission('sessions.create'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await sessionService.createSession(req.body, req.user!);
    res.status(201).json({
      success: true,
      message: 'Sesi perkuliahan berhasil dibuat.',
      data: session,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance-sessions/:id/start
router.post('/:id/start', requirePermission('sessions.manage_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await sessionService.startSession(req.params.id, req.user!);
    res.json({
      success: true,
      message: 'Sesi absensi berhasil dibuka. QR Code dinamis aktif.',
      data: session,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance-sessions/:id/close
router.post('/:id/close', requirePermission('sessions.manage_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await sessionService.closeSession(req.params.id, req.body, req.user!);
    res.json({
      success: true,
      message: 'Sesi perkuliahan berhasil ditutup dan presensi telah direkonsiliasi.',
      data: session,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance-sessions/:id/cancel
router.post('/:id/cancel', requirePermission('sessions.manage_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    const session = await sessionService.cancelSession(req.params.id, reason, req.user!);
    res.json({
      success: true,
      message: 'Sesi perkuliahan berhasil dibatalkan.',
      data: session,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance-sessions/:id/qr (Dynamic QR feed with countdown)
router.get('/:id/qr', requirePermission('sessions.manage_own'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const forceNew = req.query.force === 'true';
    const qrData = await qrService.getOrGenerateActiveToken(req.params.id, forceNew);

    // Generate base64 Data URL for easy rendering in frontend / projector view
    const qrDataUrl = await QRCode.toDataURL(qrData.tokenPlain, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        ...qrData,
        qrDataUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance-sessions/:id/records
router.get('/:id/records', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const records = await attendanceService.getSessionRecords(req.params.id, req.user!);
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

export default router;
