import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { StorageManager } from '../storage/StorageManager.js';
import { EntityName } from '../storage/IStorageProvider.js';

const router = Router();
router.use(authenticate);

// Helper for generic listing
function createListHandler(entity: EntityName) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storage = StorageManager.getInstance().getStorage();
      const items = await storage.getAll(entity);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  };
}

router.get('/study-programs', createListHandler('study_programs'));
router.get('/lecturers', createListHandler('lecturers'));
router.get('/students', createListHandler('students'));
router.get('/courses', createListHandler('courses'));
router.get('/classes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const classes = await storage.getAll<any>('classes');
    const courses = await storage.getAll<any>('courses');
    const assignments = await storage.getAll<any>('lecturer_assignments');
    const lecturers = await storage.getAll<any>('lecturers');
    const enrollments = await storage.getAll<any>('class_enrollments');

    const enriched = classes.map((cls: any) => {
      const course = courses.find((c: any) => c.id === cls.courseId);
      const asgs = assignments.filter((a: any) => a.classId === cls.id);
      const classLecturers = asgs.map((a: any) => lecturers.find((l: any) => l.id === a.lecturerId)).filter(Boolean);
      const enrolledCount = enrollments.filter((e: any) => e.classId === cls.id).length;

      return {
        ...cls,
        courseName: course?.name || '',
        courseCode: course?.code || '',
        creditsSks: course?.creditsSks || 3,
        lecturers: classLecturers,
        enrolledCount,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/schedules', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const schedules = await storage.getAll<any>('schedules');
    const classes = await storage.getAll<any>('classes');
    const courses = await storage.getAll<any>('courses');
    const rooms = await storage.getAll<any>('rooms');
    const assignments = await storage.getAll<any>('lecturer_assignments');
    const lecturers = await storage.getAll<any>('lecturers');

    const enriched = schedules.map((sch: any) => {
      const cls = classes.find((c: any) => c.id === sch.classId);
      const course = cls ? courses.find((c: any) => c.id === cls.courseId) : null;
      const room = rooms.find((r: any) => r.id === sch.roomId);
      const asg = assignments.find((a: any) => a.id === sch.lecturerAssignmentId);
      const lecturer = asg ? lecturers.find((l: any) => l.id === asg.lecturerId) : null;

      return {
        ...sch,
        classCode: cls?.code || '',
        courseName: course?.name || '',
        courseCode: course?.code || '',
        creditsSks: course?.creditsSks || 3,
        roomName: room?.name || '',
        roomCode: room?.code || '',
        lecturerName: lecturer?.fullName || '',
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/rooms', createListHandler('rooms'));
router.get('/academic-years', createListHandler('academic_years'));
router.get('/semesters', createListHandler('semesters'));

// System Settings
router.get('/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const settings = await storage.getAll<any>('system_settings');
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.settingKey] = s.settingValue; });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', requirePermission('academic_data.manage'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const updates = req.body; // e.g. { default_attendance_min_percentage: "75", default_qr_interval_seconds: "10" }

    for (const [key, value] of Object.entries(updates)) {
      const existing = await storage.findOne<any>('system_settings', s => s.settingKey === key);
      if (existing) {
        await storage.update('system_settings', existing.id, { settingValue: String(value), updatedBy: req.user!.userId });
      } else {
        await storage.create('system_settings', { settingKey: key, settingValue: String(value), updatedBy: req.user!.userId });
      }
    }

    res.json({ success: true, message: 'Pengaturan sistem berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

// Audit Logs
router.get('/audit-logs', requirePermission('audit.read'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const storage = StorageManager.getInstance().getStorage();
    const logs = await storage.getAll<any>('audit_logs');
    const users = await storage.getAll<any>('users');

    const enriched = logs.map((log: any) => {
      const actor = users.find((u: any) => u.id === log.actorUserId);
      return {
        ...log,
        actorUsername: actor?.username || 'SYSTEM',
      };
    });

    res.json({
      success: true,
      data: enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
