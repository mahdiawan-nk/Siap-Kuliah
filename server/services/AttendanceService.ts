import { StorageManager } from '../storage/StorageManager.js';
import { 
  AttendanceRecord, AttendanceSession, ClassEnrollment, Student, 
  AttendanceStatus, AuthUserPayload, LecturerAssignment, AttendanceCorrectionLog,
  AttendanceStatusHistory, AttendanceCorrectionRequest
} from '../types/entities.js';
import { QrService } from './QrService.js';

export interface ScanResult {
  success: boolean;
  status: AttendanceStatus;
  recordedAt: string;
  studentName: string;
  nim: string;
  sessionTopic: string;
  meetingNumber: number;
}

export class AttendanceService {
  private static instance: AttendanceService;

  private constructor() {}

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  public async scanQr(sessionId: string, tokenPlain: string, currentUser: AuthUserPayload): Promise<ScanResult> {
    const storage = StorageManager.getInstance().getStorage();

    if (!currentUser.studentId) {
      throw new Error('Akses ditolak: Hanya akun mahasiswa yang dapat melakukan presensi kehadiran.');
    }

    const student = await storage.getById<Student>('students', currentUser.studentId);
    if (!student) {
      throw new Error('Data profil mahasiswa tidak ditemukan.');
    }

    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);
    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    if (session.status !== 'OPEN') {
      throw new Error(`Sesi perkuliahan berstatus ${session.status}. Presensi ditolak.`);
    }

    // Check enrollment
    const enrollment = await storage.findOne<ClassEnrollment>('class_enrollments', e => 
      e.classId === session.classId && e.studentId === student.id && e.enrollmentStatus === 'ENROLLED'
    );
    if (!enrollment) {
      throw new Error('Anda tidak terdaftar sebagai peserta pada kelas perkuliahan ini.');
    }

    // Verify cryptographic token
    const tokenVerification = await QrService.getInstance().verifyToken(tokenPlain, sessionId);
    if (!tokenVerification.valid) {
      throw new Error(tokenVerification.reason || 'Token QR tidak valid atau kedaluwarsa.');
    }

    // Check if record already exists (Idempotent scan / prevent double scan)
    const existing = await storage.findOne<AttendanceRecord>('attendance_records', r => 
      r.sessionId === sessionId && r.studentId === student.id
    );
    if (existing) {
      if (existing.status === 'HADIR' || existing.status === 'TERLAMBAT') {
        return {
          success: true,
          status: existing.status,
          recordedAt: existing.recordedAt,
          studentName: student.fullName,
          nim: student.nim,
          sessionTopic: session.topic,
          meetingNumber: session.meetingNumber,
        };
      }
    }

    // Calculate HADIR vs TERLAMBAT based on late tolerance
    const now = new Date();
    const openTime = session.attendanceOpenAt ? new Date(session.attendanceOpenAt).getTime() : now.getTime();
    const toleranceMs = (session.lateToleranceMinutes || 15) * 60 * 1000;
    const isLate = now.getTime() > (openTime + toleranceMs);
    const finalStatus: AttendanceStatus = isLate ? 'TERLAMBAT' : 'HADIR';

    const recordedAt = now.toISOString();

    if (existing) {
      // Update existing record (e.g. from ALPA or placeholder)
      await storage.update<AttendanceRecord>('attendance_records', existing.id, {
        status: finalStatus,
        scannedAt: recordedAt,
        source: 'QR_SCAN',
        updatedAt: recordedAt,
      });
    } else {
      // Create new record
      await storage.create<AttendanceRecord>('attendance_records', {
        sessionId,
        studentId: student.id,
        status: finalStatus,
        scannedAt: recordedAt,
        recordedAt,
        source: 'QR_SCAN',
        updatedAt: recordedAt,
      });
    }

    // Audit log (Never log the raw token plaintext!)
    await storage.create('audit_logs', {
      actorUserId: currentUser.userId,
      action: 'ATTENDANCE_SCAN_SUCCESS',
      entityType: 'ATTENDANCE_RECORD',
      entityId: `${sessionId}:${student.id}`,
      reason: `Scan QR berhasil status ${finalStatus}`,
      beforeData: null,
      afterData: JSON.stringify({ sessionId, studentId: student.id, status: finalStatus }),
      requestId: `scan-${Date.now()}`
    });

    return {
      success: true,
      status: finalStatus,
      recordedAt,
      studentName: student.fullName,
      nim: student.nim,
      sessionTopic: session.topic,
      meetingNumber: session.meetingNumber,
    };
  }

  public async getSessionRecords(sessionId: string, currentUser: AuthUserPayload): Promise<any[]> {
    const storage = StorageManager.getInstance().getStorage();
    const session = await storage.getById<AttendanceSession>('attendance_sessions', sessionId);
    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    const enrollments = await storage.find<ClassEnrollment>('class_enrollments', e => e.classId === session.classId);
    const allStudents = await storage.getAll<Student>('students');
    const records = await storage.find<AttendanceRecord>('attendance_records', r => r.sessionId === sessionId);
    const correctionLogs = await storage.getAll<AttendanceCorrectionLog>('attendance_correction_logs');

    return enrollments.map(e => {
      const student = allStudents.find(s => s.id === e.studentId);
      const record = records.find(r => r.studentId === e.studentId);
      const corrections = record ? correctionLogs.filter(c => c.attendanceRecordId === record.id) : [];

      return {
        enrollmentId: e.id,
        studentId: e.studentId,
        nim: student?.nim || '-',
        fullName: student?.fullName || '-',
        status: record?.status || (session.status === 'CLOSED' ? 'ALPA' : 'BELUM_PRESENSI'),
        scannedAt: record?.scannedAt || null,
        recordedAt: record?.recordedAt || null,
        source: record?.source || null,
        recordId: record?.id || null,
        corrections,
      };
    });
  }

  public async correctRecord(
    recordId: string, 
    newStatus: AttendanceStatus, 
    reason: string, 
    currentUser: AuthUserPayload
  ): Promise<AttendanceRecord> {
    const storage = StorageManager.getInstance().getStorage();

    if (!reason || reason.trim().length < 10) {
      throw new Error('Alasan perubahan status kehadiran wajib diisi secara bermakna (minimal 10 karakter).');
    }

    const record = await storage.getById<AttendanceRecord>('attendance_records', recordId);
    if (!record) {
      throw new Error('Data rekaman presensi tidak ditemukan.');
    }

    const session = await storage.getById<AttendanceSession>('attendance_sessions', record.sessionId);
    if (!session) {
      throw new Error('Sesi perkuliahan tidak ditemukan.');
    }

    // Role verification
    const isAdmin = currentUser.roles.includes('ADMINISTRATOR');
    if (!isAdmin && currentUser.lecturerId) {
      const assignment = await storage.findOne<LecturerAssignment>('lecturer_assignments', a => 
        a.classId === session.classId && a.lecturerId === currentUser.lecturerId
      );
      if (!assignment) {
        throw new Error('Anda hanya dapat mengoreksi absensi pada kelas yang Anda ampu.');
      }
    }

    const oldStatus = record.status;
    const now = new Date().toISOString();

    // Transactional update & dual history recording
    const updated = await storage.transaction(async (provider) => {
      const updatedRecord = await provider.update<AttendanceRecord>('attendance_records', recordId, {
        status: newStatus,
        source: 'CORRECTION',
        updatedAt: now,
      });

      // 1. Log to attendance_correction_logs
      await provider.create<AttendanceCorrectionLog>('attendance_correction_logs', {
        attendanceRecordId: recordId,
        oldStatus,
        newStatus,
        reason: reason.trim(),
        changedBy: currentUser.userId,
        changedAt: now,
      });

      // 2. Log to attendance_status_history
      await provider.create<AttendanceStatusHistory>('attendance_status_history', {
        attendanceRecordId: recordId,
        oldStatus,
        newStatus,
        reason: reason.trim(),
        changedBy: currentUser.userId,
        changedAt: now,
      });

      // 3. Log to audit_logs
      await provider.create('audit_logs', {
        actorUserId: currentUser.userId,
        action: 'ATTENDANCE_CORRECT',
        entityType: 'ATTENDANCE_RECORD',
        entityId: recordId,
        reason: `Koreksi presensi dari ${oldStatus} menjadi ${newStatus}. Alasan: ${reason}`,
        beforeData: JSON.stringify({ status: oldStatus }),
        afterData: JSON.stringify({ status: newStatus }),
        requestId: `corr-${Date.now()}`
      });

      return updatedRecord!;
    });

    return updated;
  }

  public async getStudentAttendanceHistory(currentUser: AuthUserPayload): Promise<any[]> {
    const storage = StorageManager.getInstance().getStorage();
    if (!currentUser.studentId) {
      return [];
    }

    const studentId = currentUser.studentId;
    const enrollments = await storage.find<ClassEnrollment>('class_enrollments', e => e.studentId === studentId);
    const classes = await storage.getAll<any>('classes');
    const courses = await storage.getAll<any>('courses');
    const sessions = await storage.getAll<AttendanceSession>('attendance_sessions');
    const records = await storage.find<AttendanceRecord>('attendance_records', r => r.studentId === studentId);

    const history = records.map(r => {
      const sess = sessions.find(s => s.id === r.sessionId);
      const cls = sess ? classes.find((c: any) => c.id === sess.classId) : null;
      const course = cls ? courses.find((c: any) => c.id === cls.courseId) : null;

      return {
        recordId: r.id,
        sessionId: r.sessionId,
        courseName: course?.name || '-',
        courseCode: course?.code || '-',
        classCode: cls?.code || '-',
        meetingNumber: sess?.meetingNumber || 0,
        sessionDate: sess?.sessionDate || '-',
        topic: sess?.topic || '-',
        status: r.status,
        scannedAt: r.scannedAt,
        source: r.source,
      };
    });

    return history.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  }

  public async requestCorrection(recordId: string, requestedStatus: 'HADIR' | 'IZIN' | 'SAKIT', reason: string, currentUser: AuthUserPayload): Promise<AttendanceCorrectionRequest> {
    const storage = StorageManager.getInstance().getStorage();

    if (!reason || reason.trim().length < 10) {
      throw new Error('Alasan permohonan koreksi wajib diisi secara rinci (minimal 10 karakter).');
    }

    const record = await storage.getById<AttendanceRecord>('attendance_records', recordId);
    if (!record) {
      throw new Error('Rekaman kehadiran tidak ditemukan.');
    }

    const now = new Date().toISOString();
    return storage.create<AttendanceCorrectionRequest>('attendance_correction_requests', {
      attendanceRecordId: recordId,
      studentUserId: currentUser.userId,
      requestedStatus,
      reason: reason.trim(),
      attachmentUrl: null,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: now,
    });
  }
}
