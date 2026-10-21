import { StorageManager } from '../storage/StorageManager.js';
import { 
  AttendanceSession, Class, LecturerAssignment, ClassEnrollment, 
  LectureRealization, AttendanceRecord, AuthUserPayload, SessionStatus 
} from '../types/entities.js';
import { QrService } from './QrService.js';

export interface CreateSessionDTO {
  classId: string;
  lecturerAssignmentId?: string;
  scheduleId?: string | null;
  meetingNumber: number;
  sessionDate: string; // YYYY-MM-DD
  plannedStartAt: string;
  creditsSks?: number;
  lateToleranceMinutes?: number;
  qrIntervalSeconds?: number;
  topic: string;
}

export interface CloseSessionDTO {
  actualStartAt?: string;
  actualEndAt?: string;
  topic?: string;
  realizationNotes?: string;
}

export class SessionService {
  private static instance: SessionService;

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public async createSession(dto: CreateSessionDTO, currentUser: AuthUserPayload): Promise<AttendanceSession> {
    const storage = StorageManager.getInstance().getStorage();

    // 1. Validate class
    const cls = await storage.getById<Class>('classes', dto.classId);
    if (!cls) {
      throw new Error('Kelas perkuliahan tidak ditemukan.');
    }

    // 2. Validate lecturer assignment
    let assignmentId = dto.lecturerAssignmentId;
    if (!assignmentId) {
      const assignments = await storage.find<LecturerAssignment>('lecturer_assignments', a => a.classId === dto.classId);
      if (assignments.length === 0) {
        throw new Error('Kelas ini belum memiliki dosen pengampu terdaftar.');
      }
      // If user is a lecturer, pick their assignment
      if (currentUser.lecturerId) {
        const myAssignment = assignments.find(a => a.lecturerId === currentUser.lecturerId);
        if (myAssignment) {
          assignmentId = myAssignment.id;
        }
      }
      if (!assignmentId) {
        assignmentId = assignments[0].id;
      }
    }

    // 3. Permission check: Dosen must be assigned to this class (or Admin)
    const isAdmin = currentUser.roles.includes('ADMINISTRATOR');
    if (!isAdmin && currentUser.lecturerId) {
      const assignment = await storage.getById<LecturerAssignment>('lecturer_assignments', assignmentId!);
      if (!assignment || assignment.lecturerId !== currentUser.lecturerId) {
        throw new Error('Anda tidak memiliki izin membuat sesi pada kelas yang bukan binaan Anda.');
      }
    }

    // 4. Validate meeting number
    if (dto.meetingNumber < 1 || dto.meetingNumber > 32) {
      throw new Error('Nomor pertemuan harus berada dalam rentang 1 hingga 32.');
    }

    // Check if meeting number already exists for this class
    const existingMeeting = await storage.findOne<AttendanceSession>('attendance_sessions', s => 
      s.classId === dto.classId && s.meetingNumber === dto.meetingNumber && s.status !== 'CANCELLED'
    );
    if (existingMeeting) {
      throw new Error(`Pertemuan ke-${dto.meetingNumber} untuk kelas ini sudah ada.`);
    }

    // 5. Calculate planned duration from SKS
    const creditsSks = dto.creditsSks || 3;
    const sksSetting = await storage.findOne<any>('system_settings', s => s.settingKey === 'sks_minutes_per_credit');
    const minutesPerSks = sksSetting ? parseInt(sksSetting.settingValue, 10) : 50;
    const durationMinutes = creditsSks * minutesPerSks;

    const plannedStartDate = new Date(dto.plannedStartAt);
    const plannedEndDate = new Date(plannedStartDate.getTime() + durationMinutes * 60 * 1000);

    const qrInterval = Math.max(5, Math.min(60, dto.qrIntervalSeconds || 5));
    const lateTolerance = dto.lateToleranceMinutes ?? 15;

    const now = new Date().toISOString();
    const session = await storage.create<AttendanceSession>('attendance_sessions', {
      classId: dto.classId,
      lecturerAssignmentId: assignmentId!,
      scheduleId: dto.scheduleId || null,
      meetingNumber: dto.meetingNumber,
      sessionDate: dto.sessionDate,
      plannedStartAt: plannedStartDate.toISOString(),
      plannedEndAt: plannedEndDate.toISOString(),
      actualStartAt: null,
      actualEndAt: null,
      attendanceOpenAt: null,
      attendanceCloseAt: null,
      lateToleranceMinutes: lateTolerance,
      creditsSks,
      qrIntervalSeconds: qrInterval,
      status: 'SCHEDULED',
      topic: dto.topic,
      cancellationReason: null,
      createdBy: currentUser.userId,
      createdAt: now,
      updatedAt: now,
    });

    await storage.create('audit_logs', {
      actorUserId: currentUser.userId,
      action: 'SESSION_CREATE',
      entityType: 'ATTENDANCE_SESSION',
      entityId: session.id,
      reason: `Membuat pertemuan ke-${session.meetingNumber} topik: ${session.topic}`,
      beforeData: null,
      afterData: JSON.stringify(session),
      requestId: `sess-${Date.now()}`
    });

    return session;
  }

  public async startSession(sessionId: string, currentUser: AuthUserPayload): Promise<AttendanceSession> {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);
    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    if (session.status === 'CLOSED' || session.status === 'CANCELLED') {
      throw new Error(`Sesi telah berstatus ${session.status} dan tidak dapat dibuka kembali secara langsung.`);
    }

    // Check no other OPEN session exists for the same class
    const otherOpen = await storage.findOne<AttendanceSession>('attendance_sessions', s => 
      s.classId === session.classId && s.id !== session.id && s.status === 'OPEN'
    );
    if (otherOpen) {
      throw new Error(`Kelas ini masih memiliki sesi aktif yang belum ditutup (Pertemuan ke-${otherOpen.meetingNumber}). Tutup sesi sebelumnya terlebih dahulu.`);
    }

    const now = new Date().toISOString();
    const updated = await storage.update<AttendanceSession>('attendance_sessions', sessionId, {
      status: 'OPEN',
      actualStartAt: session.actualStartAt || now,
      attendanceOpenAt: now,
      attendanceCloseAt: null,
    });

    // Generate initial dynamic QR token
    await QrService.getInstance().getOrGenerateActiveToken(sessionId, true);

    await storage.create('audit_logs', {
      actorUserId: currentUser.userId,
      action: 'SESSION_START',
      entityType: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      reason: 'Sesi absensi dibuka oleh dosen',
      beforeData: JSON.stringify({ status: session.status }),
      afterData: JSON.stringify({ status: 'OPEN', attendanceOpenAt: now }),
      requestId: `start-${Date.now()}`
    });

    return updated!;
  }

  public async closeSession(sessionId: string, dto: CloseSessionDTO, currentUser: AuthUserPayload): Promise<AttendanceSession> {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);
    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    if (session.status === 'CLOSED') {
      return session;
    }

    const now = new Date().toISOString();
    const actualStart = dto.actualStartAt || session.actualStartAt || session.plannedStartAt;
    const actualEnd = dto.actualEndAt || now;

    // 1. Update session status
    const updated = await storage.update<AttendanceSession>('attendance_sessions', sessionId, {
      status: 'CLOSED',
      actualStartAt: actualStart,
      actualEndAt: actualEnd,
      attendanceCloseAt: now,
    });

    // 2. Save or update lecture realization (Berita Acara)
    const topic = dto.topic || session.topic;
    const existingReal = await storage.findOne<LectureRealization>('lecture_realizations', r => r.sessionId === sessionId);
    if (existingReal) {
      await storage.update<LectureRealization>('lecture_realizations', existingReal.id, {
        actualStartAt: actualStart,
        actualEndAt: actualEnd,
        topic,
        realizationNotes: dto.realizationNotes || existingReal.realizationNotes,
      });
    } else {
      await storage.create<LectureRealization>('lecture_realizations', {
        sessionId,
        actualStartAt: actualStart,
        actualEndAt: actualEnd,
        topic,
        realizationNotes: dto.realizationNotes || 'Sesi perkuliahan selesai dilaksanakan.',
        submittedBy: currentUser.userId,
        submittedAt: now,
      });
    }

    // 3. Automated Reconciliation: Record ALPA for enrolled students who have no record
    const enrollments = await storage.find<ClassEnrollment>('class_enrollments', e => e.classId === session.classId && e.enrollmentStatus === 'ENROLLED');
    const existingRecords = await storage.find<AttendanceRecord>('attendance_records', r => r.sessionId === sessionId);
    const recordedStudentIds = new Set(existingRecords.map(r => r.studentId));

    for (const enrollment of enrollments) {
      if (!recordedStudentIds.has(enrollment.studentId)) {
        await storage.create<AttendanceRecord>('attendance_records', {
          sessionId,
          studentId: enrollment.studentId,
          status: 'ALPA',
          scannedAt: null,
          recordedAt: now,
          source: 'SYSTEM_RECONCILE',
          updatedAt: now,
        });
      }
    }

    await storage.create('audit_logs', {
      actorUserId: currentUser.userId,
      action: 'SESSION_CLOSE',
      entityType: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      reason: 'Sesi ditutup dan rekonsiliasi kehadiran otomatis dijalankan',
      beforeData: JSON.stringify({ status: session.status }),
      afterData: JSON.stringify({ status: 'CLOSED', attendanceCloseAt: now }),
      requestId: `close-${Date.now()}`
    });

    return updated!;
  }

  public async cancelSession(sessionId: string, reason: string, currentUser: AuthUserPayload): Promise<AttendanceSession> {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);
    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Alasan pembatalan sesi wajib diisi secara jelas.');
    }

    const updated = await storage.update<AttendanceSession>('attendance_sessions', sessionId, {
      status: 'CANCELLED',
      cancellationReason: reason.trim(),
    });

    await storage.create('audit_logs', {
      actorUserId: currentUser.userId,
      action: 'SESSION_CANCEL',
      entityType: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      reason: `Sesi dibatalkan: ${reason}`,
      beforeData: JSON.stringify({ status: session.status }),
      afterData: JSON.stringify({ status: 'CANCELLED', cancellationReason: reason }),
      requestId: `cancel-${Date.now()}`
    });

    return updated!;
  }

  public async listSessions(filters: { classId?: string; status?: SessionStatus; studyProgramId?: string }, currentUser: AuthUserPayload): Promise<any[]> {
    const storage = StorageManager.getInstance().getStorage();
    let sessions = await storage.getAll<AttendanceSession>('attendance_sessions');

    // Scoping rules:
    if (currentUser.roles.includes('MAHASISWA') && currentUser.studentId) {
      const myEnrollments = await storage.find<ClassEnrollment>('class_enrollments', e => e.studentId === currentUser.studentId);
      const enrolledClassIds = new Set(myEnrollments.map(e => e.classId));
      sessions = sessions.filter(s => enrolledClassIds.has(s.classId));
    } else if (currentUser.roles.includes('DOSEN') && !currentUser.roles.includes('ADMINISTRATOR') && !currentUser.roles.includes('KAPRODI')) {
      const myAssignments = await storage.find<LecturerAssignment>('lecturer_assignments', a => a.lecturerId === currentUser.lecturerId);
      const assignedClassIds = new Set(myAssignments.map(a => a.classId));
      sessions = sessions.filter(s => assignedClassIds.has(s.classId));
    } else if (currentUser.roles.includes('KAPRODI') && !currentUser.roles.includes('ADMINISTRATOR')) {
      // Filter by study program
      const prodiClasses = await storage.find<Class>('classes', c => c.studyProgramId === currentUser.studyProgramId);
      const prodiClassIds = new Set(prodiClasses.map(c => c.id));
      sessions = sessions.filter(s => prodiClassIds.has(s.classId));
    }

    if (filters.classId) {
      sessions = sessions.filter(s => s.classId === filters.classId);
    }
    if (filters.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }

    // Enrich with class, course, and counts
    const enriched = await Promise.all(sessions.map(async (sess) => {
      const cls = await storage.getById<Class>('classes', sess.classId);
      const course = cls ? await storage.getById<any>('courses', cls.courseId) : null;
      const records = await storage.find<AttendanceRecord>('attendance_records', r => r.sessionId === sess.id);
      const enrollments = await storage.find<ClassEnrollment>('class_enrollments', e => e.classId === sess.classId);
      
      const stats = {
        totalEnrolled: enrollments.length,
        hadir: records.filter(r => r.status === 'HADIR').length,
        terlambat: records.filter(r => r.status === 'TERLAMBAT').length,
        izin: records.filter(r => r.status === 'IZIN').length,
        sakit: records.filter(r => r.status === 'SAKIT').length,
        alpa: records.filter(r => r.status === 'ALPA').length,
      };

      return {
        ...sess,
        classCode: cls?.code || '',
        courseName: course?.name || '',
        courseCode: course?.code || '',
        stats,
      };
    }));

    return enriched.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  }
}
