export type RoleCode = 'ADMINISTRATOR' | 'KAPRODI' | 'DOSEN' | 'MAHASISWA';
export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA';
export type SessionStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'CANCELLED';

export interface AuthUser {
  userId: string;
  username: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
  studentId?: string;
  lecturerId?: string;
  studyProgramId?: string;
}

export interface AttendanceSessionItem {
  id: string;
  classId: string;
  classCode: string;
  courseCode: string;
  courseName: string;
  meetingNumber: number;
  sessionDate: string;
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  attendanceOpenAt?: string | null;
  attendanceCloseAt?: string | null;
  lateToleranceMinutes: number;
  creditsSks: number;
  qrIntervalSeconds: number;
  status: SessionStatus;
  topic: string;
  cancellationReason?: string | null;
  stats?: {
    totalEnrolled: number;
    hadir: number;
    terlambat: number;
    izin: number;
    sakit: number;
    alpa: number;
  };
}

export interface SessionRecordItem {
  enrollmentId: string;
  studentId: string;
  nim: string;
  fullName: string;
  status: AttendanceStatus | 'BELUM_PRESENSI';
  scannedAt: string | null;
  recordedAt: string | null;
  source: string | null;
  recordId: string | null;
  corrections?: Array<{
    id: string;
    oldStatus: string;
    newStatus: string;
    reason: string;
    changedAt: string;
  }>;
}

export interface StorageStatsData {
  mode: 'json' | 'postgres';
  connected: boolean;
  counts: Record<string, number>;
  lastSyncAt: string | null;
  storagePath: string;
  databaseUrlMasked: string;
}
