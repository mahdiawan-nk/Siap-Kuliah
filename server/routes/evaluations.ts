import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { StorageManager } from '../storage/StorageManager.js';
import { CourseEvaluation, EvaluationFollowUp } from '../types/entities.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/evaluations
router.get('/', requirePermission('evaluations.read_scope'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const evals = await storage.getAll<CourseEvaluation>('course_evaluations');
    const followUps = await storage.getAll<EvaluationFollowUp>('evaluation_follow_ups');
    const lecturers = await storage.getAll<any>('lecturers');
    const classes = await storage.getAll<any>('classes');
    const courses = await storage.getAll<any>('courses');

    const enriched = evals.map(ev => {
      const lec = lecturers.find((l: any) => l.id === ev.lecturerId);
      const cls = classes.find((c: any) => c.id === ev.classId);
      const crs = cls ? courses.find((c: any) => c.id === cls.courseId) : null;
      const myFollowUps = followUps.filter(f => f.evaluationId === ev.id);

      return {
        ...ev,
        lecturerName: lec?.fullName || '-',
        classCode: cls?.code || '-',
        courseName: crs?.name || '-',
        followUps: myFollowUps,
      };
    });

    res.json({ success: true, data: enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/evaluations
router.post('/', requirePermission('evaluations.create'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const { lecturerId, classId, sessionId, evaluationType, findings, followUpDeadline } = req.body;

    if (!findings || findings.trim().length < 10) {
      res.status(400).json({ success: false, message: 'Catatan temuan evaluasi wajib diisi minimal 10 karakter.' });
      return;
    }

    const cls = await storage.getById<any>('classes', classId);
    const studyProgramId = cls?.studyProgramId || req.user?.studyProgramId || 'prodi-ti';

    const created = await storage.create<CourseEvaluation>('course_evaluations', {
      studyProgramId,
      lecturerId,
      classId,
      sessionId: sessionId || null,
      evaluatorId: req.user!.userId,
      evaluationType: evaluationType || 'PERIODIK',
      findings: findings.trim(),
      followUpDeadline: followUpDeadline || null,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });

    await storage.create('audit_logs', {
      actorUserId: req.user!.userId,
      action: 'EVALUATION_CREATE',
      entityType: 'COURSE_EVALUATION',
      entityId: created.id,
      reason: `Evaluasi dibuat: ${findings.slice(0, 50)}...`,
      beforeData: null,
      afterData: JSON.stringify(created),
      requestId: `eval-${Date.now()}`
    });

    res.status(201).json({
      success: true,
      message: 'Evaluasi perkuliahan berhasil dibuat.',
      data: created,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/evaluations/:id/follow-up
router.post('/:id/follow-up', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const { response } = req.body;

    if (!response || response.trim().length < 5) {
      res.status(400).json({ success: false, message: 'Tanggapan tindak lanjut wajib diisi.' });
      return;
    }

    const evaluation = await storage.getById<CourseEvaluation>('course_evaluations', req.params.id);
    if (!evaluation) {
      res.status(404).json({ success: false, message: 'Evaluasi tidak ditemukan.' });
      return;
    }

    const followUp = await storage.create<EvaluationFollowUp>('evaluation_follow_ups', {
      evaluationId: evaluation.id,
      response: response.trim(),
      submittedBy: req.user!.userId,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    });

    // Update evaluation status to IN_REVIEW
    await storage.update<CourseEvaluation>('course_evaluations', evaluation.id, {
      status: 'IN_REVIEW',
    });

    res.json({
      success: true,
      message: 'Tindak lanjut evaluasi berhasil disampaikan.',
      data: followUp,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/evaluations/:id/status
router.patch('/:id/status', requirePermission('evaluations.create'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const { status } = req.body; // 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'

    const updated = await storage.update<CourseEvaluation>('course_evaluations', req.params.id, {
      status,
    });

    res.json({
      success: true,
      message: `Status evaluasi berhasil diperbarui menjadi ${status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
